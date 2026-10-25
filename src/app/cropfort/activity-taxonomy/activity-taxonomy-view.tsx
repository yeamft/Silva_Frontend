"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { DataTable } from "@/components/cropfort/tanstack-data-table";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CROPFORT_ROUTES } from "@/config/navigation";
import type { PlatformActivity } from "@/lib/api/activities";
import { canProposeRateCard, canViewRateCard } from "@/lib/cropfortAccess";
import { useActivities } from "@/lib/query";
import { cn } from "@/lib/utils";

const col = createColumnHelper<PlatformActivity>();

type KindFilter = "all" | "labor" | "materials" | "services";

const KINDS: { value: KindFilter; label: string; tier: number | "" }[] = [
  { value: "all", label: "All", tier: "" },
  { value: "labor", label: "Labor", tier: 1 },
  { value: "materials", label: "Materials", tier: 2 },
  { value: "services", label: "Services", tier: 3 },
];

function kindLabel(tier: number) {
  if (tier === 1) return "Labor";
  if (tier === 2) return "Materials";
  if (tier === 3) return "Services";
  return `Tier ${tier}`;
}

const EMPTY_ROWS: PlatformActivity[] = [];

export default function ActivityTaxonomyView() {
  const { user, activeProgram } = useCropfortAuth();
  const canView =
    canViewRateCard(user.role) || user.role === "spx_platform_admin" || user.role === "spx_validator";
  const canPropose = canProposeRateCard(user.role);
  const [kind, setKind] = useState<KindFilter>("all");
  const [q, setQ] = useState("");

  const tier = KINDS.find((k) => k.value === kind)?.tier ?? "";
  const query = useActivities({ tier }, canView);
  const rows = query.data ?? EMPTY_ROWS;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        kindLabel(r.tier).toLowerCase().includes(term),
    );
  }, [rows, q]);

  const columns = useMemo(
    () => [
      col.accessor("id", {
        header: "Code",
        cell: (c) => (
          <span className="rounded bg-muted px-1.5 py-1 font-mono text-[11px] text-muted-foreground">
            {c.getValue()}
          </span>
        ),
      }),
      col.accessor("tier", {
        header: "Kind",
        cell: (c) => (
          <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {kindLabel(c.getValue())}
          </span>
        ),
      }),
      col.accessor("tier", {
        id: "serviceType",
        header: "Service type",
        cell: (c) => {
          const t = c.getValue();
          const serviceType = t === 2 ? "Project" : t === 3 ? "Intervention" : "Core";
          return (
            <span className="inline-flex rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
              {serviceType}
            </span>
          );
        },
      }),
      col.accessor("category", {
        header: "Category",
        cell: (c) => <span className="text-sm text-muted-foreground">{c.getValue()}</span>,
      }),
      col.accessor("name", {
        header: "Activity",
        cell: (c) => <span className="font-semibold text-foreground">{c.getValue()}</span>,
      }),
      col.accessor("unitOfMeasure", {
        header: "Unit",
        cell: (c) => (
          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium">
            {c.getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  if (!canView) return <NotAuthorized title="Activity Taxonomy" />;

  const categoryCount = new Set(filtered.map((r) => r.category)).size;
  const summary = query.isLoading
    ? "Loading catalogue…"
    : `${filtered.length} activities${categoryCount ? ` · ${categoryCount} categories` : ""}`;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title="Activity Taxonomy"
        meta={<span className="text-xs text-muted-foreground">{summary}</span>}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: "Activity taxonomy" },
        ]}
        actions={
          canPropose ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.benchmarkSurveys}>Benchmark surveys</Link>
            </Button>
          ) : null
        }
      />

      <SectionCard flush className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div
            role="tablist"
            aria-label="Activity kind"
            className="inline-flex h-9 w-fit max-w-full flex-wrap items-center rounded-md bg-muted p-1 text-muted-foreground"
          >
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="tab"
                aria-selected={kind === k.value}
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium transition-colors",
                  kind === k.value
                    ? "bg-background text-foreground shadow-xs"
                    : "hover:text-foreground",
                )}
                onClick={() => setKind(k.value)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <Input
            className="h-10 w-full bg-background sm:max-w-xs"
            placeholder="Search by activity, code, or category"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search activities by name, code, or category"
          />
        </div>

        <DataTable
          table={table}
          loading={query.isLoading}
          emptyTitle="No activities"
          emptyDescription={
            q
              ? "Try another activity name, code, or category."
              : "The activity catalogue is empty or has not finished loading."
          }
          className="[&_tbody_tr:nth-child(even)]:bg-muted/15 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/5"
        />
      </SectionCard>
    </PageContainer>
  );
}
