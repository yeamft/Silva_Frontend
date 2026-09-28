"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canIssueDirectInstruction } from "@/lib/cropfort/platform-access";
import { mapTicketDto, mapWorkOrderDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useDailyFieldRecords } from "@/lib/query/hooks/use-daily-field-records";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import { useWeeklyPlans } from "@/lib/query/hooks/use-weekly-plans";
import {
  useConfirmDirectInstruction,
  useDirectInstructions,
  useIssueDirectInstruction,
} from "@/lib/query/hooks/use-direct-instructions";
import { fmtEtb, ticketWaitingOn } from "@/store/cropfortOpsStore";

type ExceptionRow = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  source: string;
  href: string;
};

export default function ExceptionsView() {
  const { activeProgram, user } = useCropfortAuth();
  const woQuery = useWorkOrders(Boolean(activeProgram?.id));
  const afesQuery = useAfes(Boolean(activeProgram?.id));
  const workOrders = useMemo(
    () => (woQuery.data || []).map(mapWorkOrderDto),
    [woQuery.data],
  );
  const tickets = useMemo(() => {
    const byId = new Map((woQuery.data || []).map((w) => [w.id, w]));
    return (woQuery.data || []).flatMap((wo) =>
      (wo.tickets || []).map((t) => mapTicketDto(t, byId.get(wo.id))),
    );
  }, [woQuery.data]);
  const afes = afesQuery.data || [];
  const weeklyQuery = useWeeklyPlans(Boolean(activeProgram?.id));
  const weekly = weeklyQuery.data || [];
  const monthlyQuery = useMonthlyWorkOrders(Boolean(activeProgram?.id));
  const monthly = monthlyQuery.data || [];
  const dfrQuery = useDailyFieldRecords(Boolean(activeProgram?.id));
  const dfrs = dfrQuery.data || [];
  const diQuery = useDirectInstructions(Boolean(activeProgram?.id));
  const instructions = diQuery.data || [];
  const issueDiMut = useIssueDirectInstruction();
  const confirmDiMut = useConfirmDirectInstruction();

  const canIssue = canIssueDirectInstruction(user.role);
  const [diTitle, setDiTitle] = useState("");
  const [diDesc, setDiDesc] = useState("");
  const [diAmount, setDiAmount] = useState("10000");
  const [diMonthlyId, setDiMonthlyId] = useState("");
  const [diOral, setDiOral] = useState(false);

  const activeMonthly = useMemo(
    () => monthly.filter((o) => o.status === "active" || o.status === "approved"),
    [monthly],
  );

  useEffect(() => {
    if (!activeMonthly.length) {
      if (diMonthlyId) setDiMonthlyId("");
      return;
    }
    if (!activeMonthly.some((o) => o.id === diMonthlyId)) {
      setDiMonthlyId(activeMonthly[0].id);
    }
  }, [activeMonthly, diMonthlyId]);

  const rows = useMemo(() => {
    const list: ExceptionRow[] = [];

    for (const di of instructions) {
      if (di.status === "escalated" || di.overThreshold) {
        list.push({
          id: `di-${di.id}`,
          severity: "critical",
          title: di.code,
          detail: `${di.title} · above DI value · ${fmtEtb(di.amountEtb)}`,
          source: "Direct Instruction → Intervention",
          href: CROPFORT_ROUTES.interventions,
        });
      } else if (di.oralPendingConfirm) {
        list.push({
          id: `di-oral-${di.id}`,
          severity: "warning",
          title: di.code,
          detail: "Oral instruction — confirm in writing (1 working day)",
          source: "Direct Instruction",
          href: "#di-panel",
        });
      } else if (di.status === "issued" || di.status === "confirmed") {
        list.push({
          id: `di-open-${di.id}`,
          severity: "info",
          title: di.code,
          detail: `${di.title} · pending weekly roll-in`,
          source: "Direct Instruction",
          href: CROPFORT_ROUTES.weeklySubmissions,
        });
      }
    }

    for (const wo of workOrders) {
      if (wo.attention === "none") continue;
      list.push({
        id: `wo-${wo.id}`,
        severity: wo.attention === "overdue" ? "critical" : "warning",
        title: wo.title,
        detail: `${wo.code}${wo.monthlyWoCode ? ` · ${wo.monthlyWoCode}` : ""} · ${wo.block} · ${wo.attention.replace(/_/g, " ")}`,
        source: "Work order",
        href: `${CROPFORT_ROUTES.workOrders}?wo=${wo.id}`,
      });
    }

    for (const t of tickets) {
      if (t.status === "validated") continue;
      if (t.status === "returned") {
        list.push({
          id: `tk-${t.id}`,
          severity: "critical",
          title: t.title,
          detail: `${t.code} · returned for correction`,
          source: "Field ticket",
          href: `${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`,
        });
        continue;
      }
      if (t.status === "submitted" || t.status === "site_reviewed") {
        const wait = ticketWaitingOn(t.status);
        list.push({
          id: `tk-${t.id}`,
          severity: "warning",
          title: t.title,
          detail: `${t.code} · waiting on ${(wait ?? "review").replace(/_/g, " ")}`,
          source: "Field ticket",
          href: `${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`,
        });
      }
    }

    for (const r of dfrs) {
      if (r.loop !== "none" || r.status === "returned") {
        list.push({
          id: `dfr-${r.id}`,
          severity: "warning",
          title: r.code,
          detail: `${r.activityName} · ${r.monthlyWoCode || ""} · needs correction`,
          source: "Daily field record",
          href: CROPFORT_ROUTES.dailyFieldRecords,
        });
      } else if (r.status === "submitted" || r.status === "site_checked") {
        list.push({
          id: `dfr-val-${r.id}`,
          severity: "info",
          title: r.code,
          detail: `${r.activityName} · awaiting validation`,
          source: "Validation",
          href: CROPFORT_ROUTES.validationQueue,
        });
      }
    }

    for (const p of weekly) {
      if (p.loop !== "none") {
        list.push({
          id: `wp-${p.id}`,
          severity: "critical",
          title: p.code,
          detail: `${p.weekLabel} · ${p.monthlyWoCode || ""} · budget overrun flagged`,
          source: "Weekly plan",
          href: CROPFORT_ROUTES.weeklySubmissions,
        });
      } else if (p.status === "submitted") {
        list.push({
          id: `wp-sub-${p.id}`,
          severity: "info",
          title: p.code,
          detail: `${p.weekLabel} · awaiting review`,
          source: "Approvals",
          href: CROPFORT_ROUTES.approvals,
        });
      }
    }

    for (const o of monthly) {
      if (o.status === "submitted") {
        list.push({
          id: `mwo-${o.id}`,
          severity: "info",
          title: o.code,
          detail: `${o.farmName} · monthly WO · Silva decision`,
          source: "Approvals",
          href: CROPFORT_ROUTES.approvals,
        });
      }
    }

    for (const a of afes) {
      if (a.status === "submitted") {
        list.push({
          id: `afe-${a.id}`,
          severity: "info",
          title: a.title,
          detail: `${a.id.slice(0, 10)} · Band ${a.band} · ${fmtEtb(a.amountEtb)}`,
          source: "AFE approval",
          href: CROPFORT_ROUTES.afe,
        });
      } else if (a.status === "returned") {
        list.push({
          id: `afe-ret-${a.id}`,
          severity: "warning",
          title: a.title,
          detail: a.returnedComment || "Returned for revision",
          source: "AFE",
          href: CROPFORT_ROUTES.afe,
        });
      }
    }

    for (const wo of workOrders) {
      if (wo.status === "draft") {
        list.push({
          id: `wo-draft-${wo.id}`,
          severity: "info",
          title: wo.title,
          detail: `${wo.code} · queued, not issued`,
          source: "Work order",
          href: `${CROPFORT_ROUTES.workOrders}?wo=${wo.id}`,
        });
      }
    }

    const rank = { critical: 0, warning: 1, info: 2 };
    return list.sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [
    workOrders,
    tickets,
    dfrs,
    weekly,
    monthly,
    afes,
    instructions,
  ]);

  const counts = {
    critical: rows.filter((r) => r.severity === "critical").length,
    warning: rows.filter((r) => r.severity === "warning").length,
    info: rows.filter((r) => r.severity === "info").length,
  };

  const onIssueDi = async () => {
    if (!canIssue) {
      toast.error("Only SPX can issue Direct Instructions");
      return;
    }
    const mwo = monthly.find((o) => o.id === diMonthlyId) ?? activeMonthly[0];
    if (!mwo) {
      toast.error("Select an active monthly WO");
      return;
    }
    try {
      const row = await issueDiMut.mutateAsync({
        title: diTitle.trim() || "Urgent field change",
        description: diDesc,
        amountEtb: Number(diAmount) || 0,
        blockId: mwo.lines[0]?.blockId ?? "",
        blockCode: mwo.lines[0]?.blockCode ?? "",
        monthlyWoId: mwo.id,
        monthlyWoCode: mwo.code,
        oral: diOral,
      });
      setDiTitle("");
      setDiDesc("");
      if (row.overThreshold) {
        toast.message(`${row.code} above DI value — escalated to Intervention`);
      } else {
        toast.success(`${row.code} issued — will roll into next weekly plan`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue DI");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Control"}
        title="Exceptions & Decisions"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Control", href: CROPFORT_ROUTES.approvals },
          { label: "Exceptions & Decisions" },
        ]}
        meta={
          <>
            <span className="text-xs tabular-nums">{counts.critical} critical</span>
            <span className="text-xs tabular-nums">{counts.warning} warning</span>
            <span className="text-xs tabular-nums">{counts.info} open</span>
          </>
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.approvals}>Approvals</Link>
          </Button>
        }
      />

      <SectionCard
        title="Direct Instruction"
        className="mb-4"
      >
        {canIssue ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 lg:col-span-2">
              <Label>Title</Label>
              <Input
                value={diTitle}
                onChange={(e) => setDiTitle(e.target.value)}
                placeholder="Small change or urgent job"
              />
            </div>
            <div className="space-y-1">
              <Label>Amount (ETB)</Label>
              <Input value={diAmount} onChange={(e) => setDiAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Monthly WO</Label>
              <Select
                value={diMonthlyId || activeMonthly[0]?.id || ""}
                onValueChange={setDiMonthlyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Monthly WO" />
                </SelectTrigger>
                <SelectContent>
                  {(activeMonthly.length ? activeMonthly : monthly).map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Detail</Label>
              <Textarea
                rows={2}
                value={diDesc}
                onChange={(e) => setDiDesc(e.target.value)}
                placeholder="What changed on site"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={diOral}
                onChange={(e) => setDiOral(e.target.checked)}
              />
              Oral on site (confirm in writing within 1 day)
            </label>
            <div className="flex items-end">
              <Button size="sm" onClick={onIssueDi}>
                Issue Direct Instruction
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only SPX issues Direct Instructions. Open items appear in the list below.
          </p>
        )}

        {instructions.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            {instructions.slice(0, 8).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{d.code}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {d.title} · {fmtEtb(d.amountEtb)}
                    {d.monthlyWoCode ? ` · ${d.monthlyWoCode}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge
                    status={d.overThreshold ? "overdue" : d.status === "confirmed" ? "approved" : "pending"}
                    label={d.status.replace(/_/g, " ")}
                  />
                  {d.oralPendingConfirm ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={confirmDiMut.isPending}
                      onClick={() => {
                        void confirmDiMut
                          .mutateAsync(d.id)
                          .then(() => toast.success("Written confirmation recorded"))
                          .catch((e) =>
                            toast.error(e instanceof Error ? e.message : "Confirm failed"),
                          );
                      }}
                    >
                      Confirm written
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <SectionCard title="Open exceptions" flush>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No exceptions right now. Work orders, tickets, validations, DIs, and approvals will
            appear here when they need action.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <StatusBadge
                      status={
                        r.severity === "critical"
                          ? "overdue"
                          : r.severity === "warning"
                            ? "at_risk"
                            : "pending"
                      }
                      label={r.severity}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground">{r.source}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={r.href}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </PageContainer>
  );
}
