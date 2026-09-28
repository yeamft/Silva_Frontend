"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useAuditLog } from "@/lib/query/hooks/use-audit-log";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | string;

function sourceFromEntity(entityType: string): string {
  const t = entityType.toLowerCase();
  if (t.includes("afe") || t.includes("approval") || t.includes("programme")) return "approvals";
  if (t.includes("rate") || t.includes("benchmark")) return "rates";
  if (t.includes("report")) return "reports";
  if (t.includes("plan") || t.includes("mwo") || t.includes("weekly")) return "planning";
  if (t.includes("user") || t.includes("program") || t.includes("org")) return "admin";
  return "execution";
}

const FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "execution", label: "Execution" },
  { id: "approvals", label: "Approvals" },
  { id: "planning", label: "Planning" },
  { id: "rates", label: "Rates" },
  { id: "reports", label: "Reports" },
  { id: "admin", label: "Admin" },
];

export default function AuditTrailView() {
  const { activeProgram, user } = useCropfortAuth();
  const area = getCropfortArea("audit");
  const auditQuery = useAuditLog(Boolean(activeProgram?.id), { limit: 200 });

  const [filter, setFilter] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const feed = useMemo(() => {
    return (auditQuery.data || []).map((row) => ({
      id: row.id,
      at: row.at,
      actor: row.actorName || row.actorUserId || "System",
      action: row.action,
      entityLabel: row.entityType,
      entityCode: row.entityId,
      source: sourceFromEntity(row.entityType),
      detail: row.detail,
    }));
  }, [auditQuery.data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((row) => {
      if (filter !== "all" && row.source !== filter) return false;
      if (!q) return true;
      return [row.actor, row.action, row.entityLabel, row.entityCode, row.detail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [feed, filter, query]);

  const selected = visible.find((r) => r.id === selectedId) ?? feed.find((r) => r.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: feed.length };
    for (const row of feed) {
      map[row.source] = (map[row.source] ?? 0) + 1;
    }
    return map;
  }, [feed]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Administration"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Administration" },
          { label: area.label },
        ]}
        meta={
          <span className="text-xs text-muted-foreground">
            {auditQuery.isLoading
              ? "Loading…"
              : `${visible.length} event${visible.length === 1 ? "" : "s"}`}
            {user.name ? ` · viewed as ${user.name}` : ""}
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "secondary" : "outline"}
              className="h-8"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {counts[f.id] != null ? (
                <span className="ml-1 tabular-nums opacity-70">({counts[f.id]})</span>
              ) : null}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            placeholder="Search actor, action, entity…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search audit trail"
          />
        </div>
      </div>

      <SectionCard title="Timeline" flush>
        {auditQuery.isError ? (
          <p className="px-5 py-10 text-center text-sm text-destructive">
            {auditQuery.error instanceof Error
              ? auditQuery.error.message
              : "Could not load audit log"}
          </p>
        ) : auditQuery.isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Loading audit events…
          </p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No audit events match this filter.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer",
                    selectedId === row.id && "bg-primary/[0.04]",
                  )}
                  onClick={() => setSelectedId(row.id)}
                >
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(row.at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{row.actor}</TableCell>
                  <TableCell>
                    <StatusBadge status="pending" label={row.action} />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{row.entityLabel}</p>
                    {row.entityCode ? (
                      <p className="text-xs text-muted-foreground">{row.entityCode}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {row.source}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.entityLabel}</SheetTitle>
                <SheetDescription>
                  {selected.entityCode ? `${selected.entityCode} · ` : ""}
                  {selected.source}
                </SheetDescription>
              </SheetHeader>
              <dl className="mt-6 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">When</dt>
                  <dd className="mt-0.5 font-medium">
                    {new Date(selected.at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Actor</dt>
                  <dd className="mt-0.5 font-medium">{selected.actor}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Action</dt>
                  <dd className="mt-0.5">
                    <StatusBadge status="pending" label={selected.action} />
                  </dd>
                </div>
                {selected.detail ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Detail</dt>
                    <dd className="mt-0.5 text-muted-foreground">{selected.detail}</dd>
                  </div>
                ) : null}
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
