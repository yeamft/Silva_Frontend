"use client";

import { useMemo, useState } from "react";
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
import { fmtEtb, ticketWaitingOn, useCropfortOpsStore } from "@/store/cropfortOpsStore";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import { useDailyFieldRecordStore } from "@/store/dailyFieldRecordStore";
import { useDirectInstructionStore } from "@/store/directInstructionStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";

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
  const workOrders = useCropfortOpsStore((s) => s.workOrders);
  const tickets = useCropfortOpsStore((s) => s.tickets);
  const afes = useCropfortOpsStore((s) => s.afes);
  const projects = useCropfortOpsStore((s) => s.projects);
  const interventions = useCropfortOpsStore((s) => s.interventions);
  const dfrs = useDailyFieldRecordStore((s) => s.records);
  const weekly = useWeeklyPlanStore((s) => s.plans);
  const monthly = useMonthlyWorkOrderStore((s) => s.orders);
  const instructions = useDirectInstructionStore((s) => s.instructions);
  const issueDi = useDirectInstructionStore((s) => s.issue);
  const confirmWritten = useDirectInstructionStore((s) => s.confirmWritten);
  const diValue = useAgreementConfigStore((s) => s.directInstructionValueEtb);

  const canIssue = canIssueDirectInstruction(user.role);
  const [diTitle, setDiTitle] = useState("");
  const [diDesc, setDiDesc] = useState("");
  const [diAmount, setDiAmount] = useState("10000");
  const [diMonthlyId, setDiMonthlyId] = useState(monthly[0]?.id ?? "");
  const [diOral, setDiOral] = useState(false);

  const activeMonthly = useMemo(
    () => monthly.filter((o) => o.status === "active" || o.status === "approved"),
    [monthly],
  );

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
          detail: `${a.code} · Band ${a.band}`,
          source: "AFE approval",
          href: CROPFORT_ROUTES.approvals,
        });
      }
    }

    for (const p of projects) {
      if (p.status === "submitted") {
        list.push({
          id: `prj-${p.id}`,
          severity: "info",
          title: p.title,
          detail: `${p.code} · Band ${p.band}`,
          source: "Project approval",
          href: CROPFORT_ROUTES.approvals,
        });
      }
    }

    for (const i of interventions) {
      if (i.status === "draft" && i.code.startsWith("INT-DI-")) {
        list.push({
          id: `int-${i.id}`,
          severity: "warning",
          title: i.title,
          detail: `${i.code} · DI over threshold`,
          source: "Intervention",
          href: CROPFORT_ROUTES.interventions,
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
    projects,
    interventions,
    instructions,
  ]);

  const counts = {
    critical: rows.filter((r) => r.severity === "critical").length,
    warning: rows.filter((r) => r.severity === "warning").length,
    info: rows.filter((r) => r.severity === "info").length,
  };

  const onIssueDi = () => {
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
      const row = issueDi({
        title: diTitle.trim() || "Urgent field change",
        description: diDesc,
        amountEtb: Number(diAmount) || 0,
        blockId: mwo.lines[0]?.blockId ?? "blk-sh01",
        blockCode: mwo.lines[0]?.blockCode ?? "SH-01",
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
        description={`Under ${fmtEtb(diValue)} binds Chaka Buna; above routes to Intervention (RB03.7–8 / RB10.11)`}
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
                    <Button size="sm" variant="outline" onClick={() => confirmWritten(d.id)}>
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
