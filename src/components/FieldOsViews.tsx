"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  Landmark,
  Plus,
  Shield,
  Sprout,
  Ticket,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFieldOsStore } from "@/store/fieldOsStore";
import { bandLabel, formatUsd } from "@/lib/schedule3";
import {
  canApproveAfp,
  canApproveBandCd,
  canIssueInstruments,
  canSeeSpxRevenue,
  canSubmitFieldWork,
  canValidateWork,
} from "@/lib/fieldFirewalls";
import MetricCard from "@/components/MetricCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-1.5 rounded-full gold-gradient sm:block" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function DataTableCard({
  title,
  children,
  empty,
}: {
  title?: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="border-border/70 bg-card/90 shadow-card backdrop-blur-sm">
      {title ? (
        <CardHeader className="border-b border-border/60 bg-muted/25 py-3.5">
          <CardTitle className="text-sm font-semibold tracking-wide">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="p-0">
        <div className="overflow-x-auto">{children}</div>
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-muted-foreground">
            <Sprout className="h-8 w-8 opacity-40" />
            <p className="text-sm">Nothing here yet</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "approved" || status === "validated" || status === "released" || status === "issued"
      ? "default"
      : status === "pending_owner" || status === "submitted" || status === "recommended"
        ? "secondary"
        : status === "rejected"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
}

const budgetChartConfig = {
  budget: { label: "Budget", color: "hsl(var(--primary))" },
  actual: { label: "Actual", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

const bandChartConfig = {
  A: { label: "Band A", color: "hsl(152 42% 38%)" },
  B: { label: "Band B", color: "hsl(198 70% 42%)" },
  C: { label: "Band C", color: "hsl(36 90% 48%)" },
  D: { label: "Band D", color: "hsl(0 72% 50%)" },
} satisfies ChartConfig;

const pipelineChartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const revenueChartConfig = {
  principal: { label: "Account Manager", color: "hsl(var(--primary))" },
  fee: { label: "SPX fee", color: "hsl(var(--accent))" },
} satisfies ChartConfig;

export function FieldDashboardView() {
  const user = useAuthStore((s) => s.user);
  const program = useFieldOsStore((s) => s.program);
  const afps = useFieldOsStore((s) => s.afps);
  const afes = useFieldOsStore((s) => s.afes);
  const workOrders = useFieldOsStore((s) => s.workOrders);
  const fieldTickets = useFieldOsStore((s) => s.fieldTickets);
  const paymentRequests = useFieldOsStore((s) => s.paymentRequests);
  const settlements = useFieldOsStore((s) => s.settlements);
  const revenueLedger = useFieldOsStore((s) => s.revenueLedger);
  const role = user?.role ?? "silva_owner";
  const showRevenue = role === "spx_principal";

  const afp = afps[0];
  const pendingOwner = afes.filter((a) => a.status === "pending_owner" || a.status === "recommended").length;
  const openWo = workOrders.filter((w) => w.status === "issued" || w.status === "in_progress").length;
  const awaitingValidation = fieldTickets.filter((t) => t.status === "submitted").length;
  const releasedSettlements = settlements.filter((s) => s.status === "released").length;
  const openPr = paymentRequests.filter((p) => p.status === "submitted").length;

  const budgetTotal = afp?.lines.reduce((s, l) => s + l.budgetUsd, 0) ?? 0;
  const actualTotal = afp?.lines.reduce((s, l) => s + l.actualUsd, 0) ?? 0;
  const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round((actualTotal / budgetTotal) * 100)) : 0;
  const afeVolume = afes.reduce((s, a) => s + a.amountUsd, 0);

  const deskLabel =
    role === "silva_owner" ? "Govern · Silva" : role === "spx_principal" ? "Manage · SPX" : "Execute · Vendor";

  const budgetBars = useMemo(
    () =>
      (afp?.lines ?? []).map((l) => ({
        line: l.code,
        name: l.description,
        budget: l.budgetUsd,
        actual: l.actualUsd,
      })),
    [afp]
  );

  const bandPie = useMemo(() => {
    const bands = ["A", "B", "C", "D"] as const;
    return bands
      .map((band) => ({
        band,
        amount: afes.filter((a) => a.band === band).reduce((s, a) => s + a.amountUsd, 0),
        count: afes.filter((a) => a.band === band).length,
        fill: `var(--color-${band})`,
      }))
      .filter((b) => b.count > 0);
  }, [afes]);

  const pipelineBars = useMemo(() => {
    const ticketCount = role === "silva_owner" ? 0 : fieldTickets.length;
    const prCount = role === "silva_owner" ? 0 : paymentRequests.length;
    return [
      { stage: "AFP", count: afps.length },
      { stage: "AFE", count: afes.length },
      { stage: "WO", count: workOrders.length },
      { stage: "Tickets", count: ticketCount },
      { stage: "Pay req", count: prCount },
      { stage: "Settled", count: settlements.length },
    ];
  }, [afps, afes, workOrders, fieldTickets, paymentRequests, settlements, role]);

  const afeStatusBars = useMemo(() => {
    const statuses = ["recommended", "pending_owner", "approved", "issued"] as const;
    return statuses.map((status) => ({
      status: status.replace("_", " "),
      count: afes.filter((a) => a.status === status).length,
      amount: afes.filter((a) => a.status === status).reduce((s, a) => s + a.amountUsd, 0),
    }));
  }, [afes]);

  const revenueBars = useMemo(
    () =>
      revenueLedger.map((r) => ({
        id: r.afeId.replace("afe-", "").slice(0, 8),
        principal: r.principalAmountUsd,
        fee: r.feeAmountUsd,
      })),
    [revenueLedger]
  );

  const chain = [
    { label: "AFP", icon: FileStack, status: afp?.status ?? "—" },
    { label: "AFE", icon: ClipboardCheck, status: `${afes.filter((a) => a.status === "issued").length} issued` },
    { label: "WO", icon: CheckCircle2, status: `${openWo} open` },
    { label: "Ticket", icon: Ticket, status: role === "silva_owner" ? "firewall" : `${awaitingValidation} pending` },
    { label: "Pay", icon: Landmark, status: role === "silva_owner" ? "firewall" : `${openPr} open` },
    { label: "Settle", icon: Shield, status: `${releasedSettlements} released` },
  ];

  const attentionAfes = afes
    .filter((a) => ["pending_owner", "recommended", "approved"].includes(a.status))
    .slice(0, 5);

  const recentWos = (
    role === "vendor_lead" ? workOrders.filter((w) => w.vendorOrgId === "org-bagro") : workOrders
  ).slice(0, 5);

  return (
    <div className="farm-page">
      <Card className="border-border/70 bg-card shadow-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl sm:text-2xl">{program.name}</CardTitle>
              <Badge variant="secondary">{program.code}</Badge>
              <Badge className="gold-gradient border-0 text-primary-foreground">{deskLabel}</Badge>
            </div>
            <CardDescription>
              {program.estateName} · {program.hectares} ha · {program.currency}
            </CardDescription>
          </div>
          {afp ? <StatusBadge status={afp.status} /> : null}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Budget used"
          value={`${budgetPct}%`}
          change={formatUsd(actualTotal)}
          changeType={budgetPct > 85 ? "negative" : "neutral"}
          icon={FileStack}
        />
        <MetricCard
          title="AFE volume"
          value={formatUsd(afeVolume)}
          change={`${afes.length} AFEs`}
          icon={ClipboardCheck}
        />
        <MetricCard
          title="AFEs needing action"
          value={String(pendingOwner)}
          changeType={pendingOwner > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
        />
        <MetricCard
          title={role === "silva_owner" ? "Settlements released" : "Open work orders"}
          value={role === "silva_owner" ? String(releasedSettlements) : String(openWo)}
          icon={role === "silva_owner" ? Shield : CheckCircle2}
        />
      </div>

      {(pendingOwner > 0 || awaitingValidation > 0 || openPr > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Needs attention</AlertTitle>
          <AlertDescription className="flex flex-wrap gap-2 pt-2">
            {pendingOwner > 0 ? <Badge variant="secondary">{pendingOwner} AFE awaiting owner/issue</Badge> : null}
            {role !== "silva_owner" && awaitingValidation > 0 ? (
              <Badge variant="secondary">{awaitingValidation} tickets to validate</Badge>
            ) : null}
            {role !== "silva_owner" && openPr > 0 ? (
              <Badge variant="secondary">{openPr} payment requests open</Badge>
            ) : null}
            {role === "silva_owner" ? (
              <span className="text-sm text-muted-foreground">
                Raw tickets and payment requests stay behind the SPX firewall.
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/70 bg-card shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Budget vs actual by AFP line</CardTitle>
                <CardDescription>Planned spend against field actuals</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={budgetChartConfig} className="aspect-[16/9] w-full">
                  <BarChart data={budgetBars} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="line" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <span className="font-medium tabular-nums">
                              {formatUsd(Number(value))} · {String(name)}
                            </span>
                          )}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="budget" fill="var(--color-budget)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card shadow-card">
              <CardHeader>
                <CardTitle className="text-base">AFE by Schedule 3 band</CardTitle>
                <CardDescription>Authorization mix by band</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={bandChartConfig} className="mx-auto aspect-square max-h-[260px]">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          nameKey="band"
                          formatter={(value, _name, item) => (
                            <span className="font-medium tabular-nums">
                              {formatUsd(Number(value))} · {item.payload.count} AFE
                              {item.payload.count === 1 ? "" : "s"}
                            </span>
                          )}
                        />
                      }
                    />
                    <Pie data={bandPie} dataKey="amount" nameKey="band" innerRadius={55} outerRadius={90} strokeWidth={2}>
                      {bandPie.map((entry) => (
                        <Cell key={entry.band} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="band" />} />
                  </PieChart>
                </ChartContainer>
                <div className="mt-2 space-y-1">
                  {bandPie.map((b) => (
                    <div key={b.band} className="flex justify-between text-xs text-muted-foreground">
                      <span>Band {b.band}</span>
                      <span className="tabular-nums">{formatUsd(b.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Instrument chain</CardTitle>
              <CardDescription>Live status across the operating path</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {chain.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <Card className="border-border/60 bg-muted/30 shadow-xs">
                      <CardContent className="flex items-center gap-2 px-3 py-2">
                        <step.icon className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-xs font-semibold">{step.label}</p>
                          <p className="text-[10px] capitalize text-muted-foreground">{step.status}</p>
                        </div>
                      </CardContent>
                    </Card>
                    {i < chain.length - 1 ? (
                      <ArrowRight className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/70 bg-card shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Spend utilization</CardTitle>
                <CardDescription>Actual against AFP budget</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{formatUsd(actualTotal)}</p>
                    <p className="text-xs text-muted-foreground">of {formatUsd(budgetTotal)}</p>
                  </div>
                  <Badge variant="outline">{budgetPct}%</Badge>
                </div>
                <Progress value={budgetPct} className="h-2.5" />
                <Separator />
                <div className="space-y-2">
                  {afp?.lines.map((line) => {
                    const pct =
                      line.budgetUsd > 0
                        ? Math.min(100, Math.round((line.actualUsd / line.budgetUsd) * 100))
                        : 0;
                    return (
                      <div key={line.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">
                            {line.code} · {line.description}
                          </span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">AFE status value</CardTitle>
                <CardDescription>Count and USD by authorization status</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pipelineChartConfig} className="aspect-[16/8] w-full">
                  <BarChart data={afeStatusBars} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="status" width={100} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => (
                            <span className="font-medium tabular-nums">
                              {item.payload.count} AFEs · {formatUsd(Number(item.payload.amount))}
                            </span>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="amount" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {showRevenue ? (
            <Card className="border-border/70 bg-card shadow-card">
              <CardHeader>
                <CardTitle className="text-base">SPX revenue ledger</CardTitle>
                <CardDescription>Account Manager–only fee view (firewall)</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={revenueChartConfig} className="aspect-[21/9] w-full">
                  <BarChart data={revenueBars} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="id" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="principal" fill="var(--color-principal)" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="fee" fill="var(--color-fee)" radius={[4, 4, 0, 0]} stackId="b" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Revenue firewall</AlertTitle>
              <AlertDescription>
                SPX fee charts are hidden on Silva and vendor desks.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <Card className="border-border/70 bg-card shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Chain volume</CardTitle>
              <CardDescription>
                Instrument counts
                {role === "silva_owner" ? " (tickets/PRs masked by firewall)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pipelineChartConfig} className="aspect-[21/9] w-full">
                <BarChart data={pipelineBars} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70 bg-card shadow-card">
              <CardHeader className="border-b border-border/60 bg-muted/25 py-3.5">
                <CardTitle className="text-sm font-semibold tracking-wide">AFE pipeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Band</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(attentionAfes.length ? attentionAfes : afes.slice(0, 5)).map((afe) => (
                      <TableRow key={afe.id}>
                        <TableCell className="max-w-[180px] truncate font-medium">{afe.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{afe.band}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(afe.amountUsd)}</TableCell>
                        <TableCell>
                          <StatusBadge status={afe.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {afes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          No AFEs yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card shadow-card">
              <CardHeader className="border-b border-border/60 bg-muted/25 py-3.5">
                <CardTitle className="text-sm font-semibold tracking-wide">Work orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentWos.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">{wo.title}</TableCell>
                        <TableCell className="text-muted-foreground">{wo.issuedAt ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={wo.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentWos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          No work orders yet
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
              {role === "silva_owner" ? (
                <CardFooter className="border-t border-border/60 py-3">
                  <p className="text-xs text-muted-foreground">
                    Silva sees issued WOs for oversight; field tickets remain SPX/vendor only.
                  </p>
                </CardFooter>
              ) : null}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function AfpView() {
  const user = useAuthStore((s) => s.user);
  const afps = useFieldOsStore((s) => s.afps);
  const approveAfp = useFieldOsStore((s) => s.approveAfp);
  const afp = afps[0];

  return (
    <div className="farm-page">
      <PageHeader
        title="Annual Farm Plan"
        action={
          user && canApproveAfp(user.role) && afp?.status === "submitted" ? (
            <Button
              className="gold-gradient text-primary-foreground hover:brightness-105"
              onClick={() => {
                if (approveAfp(afp.id)) toast.success("AFP approved");
              }}
            >
              Approve AFP
            </Button>
          ) : null
        }
      />

      {afp ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">{afp.title}</h3>
            <StatusBadge status={afp.status} />
          </div>
          <DataTableCard title="AFP lines">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {afp.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.code}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(line.budgetUsd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(line.actualUsd)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-medium",
                        line.actualUsd > line.budgetUsd ? "text-destructive" : "text-success"
                      )}
                    >
                      {formatUsd(line.budgetUsd - line.actualUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </>
      ) : null}
    </div>
  );
}

export function AfeView() {
  const user = useAuthStore((s) => s.user);
  const afps = useFieldOsStore((s) => s.afps);
  const afes = useFieldOsStore((s) => s.afes);
  const approveAfe = useFieldOsStore((s) => s.approveAfe);
  const issueAfe = useFieldOsStore((s) => s.issueAfe);
  const createAfe = useFieldOsStore((s) => s.createAfe);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("8000");
  const [lineId, setLineId] = useState(afps[0]?.lines[0]?.id ?? "");

  return (
    <div className="farm-page">
      <PageHeader title="Authorizations for Expenditure" />

      {user?.role === "spx_principal" ? (
        <Card className="border-border/70 bg-card/90 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Author AFE</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" />
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>AFP line</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {afps[0]?.lines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.code} · {l.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="gap-2 gold-gradient text-primary-foreground hover:brightness-105"
              onClick={() => {
                if (!title) return;
                const afe = createAfe({
                  afpLineId: lineId,
                  title,
                  amountUsd: Number(amount) || 0,
                  vendorOrgId: "org-bagro",
                });
                toast.success(`AFE created · ${bandLabel(afe.band)}`);
                setTitle("");
              }}
            >
              <Plus className="h-4 w-4" /> Create AFE
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      <DataTableCard title="AFE register">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Band</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {afes.map((afe) => (
              <TableRow key={afe.id}>
                <TableCell className="font-medium">{afe.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{afe.band}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(afe.amountUsd)}</TableCell>
                <TableCell>
                  <StatusBadge status={afe.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {user &&
                      canApproveBandCd(user.role) &&
                      (afe.status === "pending_owner" || afe.status === "recommended") &&
                      (afe.band === "C" || afe.band === "D") && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const r = approveAfe(afe.id, user.role);
                            if (r.ok) toast.success("AFE approved by Silva");
                            else toast.error(r.error);
                          }}
                        >
                          Approve
                        </Button>
                      )}
                    {user && canIssueInstruments(user.role) && afe.status !== "issued" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const r = issueAfe(afe.id);
                          if (r.ok) toast.success("AFE issued");
                          else toast.error(r.error);
                        }}
                      >
                        Issue
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function WorkOrdersView() {
  const user = useAuthStore((s) => s.user);
  const afes = useFieldOsStore((s) => s.afes);
  const workOrders = useFieldOsStore((s) => s.workOrders);
  const vendors = useFieldOsStore((s) => s.vendors);
  const issueWorkOrder = useFieldOsStore((s) => s.issueWorkOrder);
  const issuedAfes = afes.filter((a) => a.status === "issued");

  const rows = useMemo(() => {
    if (user?.role === "vendor_lead") {
      return workOrders.filter((w) => w.vendorOrgId === "org-bagro");
    }
    return workOrders;
  }, [workOrders, user?.role]);

  return (
    <div className="farm-page">
      <PageHeader title="Work Orders" />

      {user && canIssueInstruments(user.role) ? (
        <Card className="border-border/70 bg-card/90 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Issue work order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Schedule 4 insurance gate runs before issue. Vendor insurance:{" "}
              {vendors[0]?.insuranceOnFile ? `on file · expires ${vendors[0].insuranceExpiresOn}` : "missing"}
            </p>
            <div className="flex flex-wrap gap-2">
              {issuedAfes.map((afe) => (
                <Button
                  key={afe.id}
                  size="sm"
                  className="gold-gradient text-primary-foreground hover:brightness-105"
                  onClick={() => {
                    const r = issueWorkOrder(afe.id);
                    if (r.ok) toast.success("Work order issued");
                    else toast.error(r.error);
                  }}
                >
                  Issue WO · {afe.title.slice(0, 28)}
                </Button>
              ))}
              {issuedAfes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No issued AFEs available.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DataTableCard title="Work order register" empty={rows.length === 0}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((wo) => (
              <TableRow key={wo.id}>
                <TableCell className="font-medium">{wo.title}</TableCell>
                <TableCell>{wo.insuranceGatePassed ? "Passed" : "Blocked"}</TableCell>
                <TableCell>{wo.issuedAt ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={wo.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function FieldTicketsView() {
  const user = useAuthStore((s) => s.user);
  const workOrders = useFieldOsStore((s) => s.workOrders);
  const fieldTickets = useFieldOsStore((s) => s.fieldTickets);
  const submitFieldTicket = useFieldOsStore((s) => s.submitFieldTicket);
  const validateFieldTicket = useFieldOsStore((s) => s.validateFieldTicket);
  const [woId, setWoId] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("8");
  const [amount, setAmount] = useState("500");

  const openWos = workOrders.filter((w) => w.status === "issued" || w.status === "in_progress");

  return (
    <div className="farm-page">
      <PageHeader title="Field Tickets" />

      {user && canSubmitFieldWork(user.role) ? (
        <Card className="border-border/70 bg-card/90 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Submit field ticket</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Work order</Label>
              <Select value={woId} onValueChange={setWoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select WO" />
                </SelectTrigger>
                <SelectContent>
                  {openWos.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Labor hours</Label>
              <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="gold-gradient text-primary-foreground hover:brightness-105"
              onClick={() => {
                const r = submitFieldTicket({
                  workOrderId: woId,
                  description,
                  laborHours: Number(hours) || 0,
                  amountUsd: Number(amount) || 0,
                  submittedBy: user.email,
                });
                if (r.ok) {
                  toast.success("Field ticket submitted");
                  setDescription("");
                } else toast.error(r.error);
              }}
            >
              Submit ticket
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      <DataTableCard title="Ticket register">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fieldTickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.date}</TableCell>
                <TableCell className="max-w-xs truncate font-medium">{t.description}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(t.amountUsd)}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-right">
                  {user && canValidateWork(user.role) && t.status === "submitted" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const r = validateFieldTicket(t.id, user.email);
                        if (r.ok) toast.success("Ticket validated");
                        else toast.error(r.error);
                      }}
                    >
                      Validate
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function PaymentRequestsView() {
  const user = useAuthStore((s) => s.user);
  const fieldTickets = useFieldOsStore((s) => s.fieldTickets);
  const paymentRequests = useFieldOsStore((s) => s.paymentRequests);
  const submitPaymentRequest = useFieldOsStore((s) => s.submitPaymentRequest);
  const approvePaymentRequest = useFieldOsStore((s) => s.approvePaymentRequest);
  const validated = fieldTickets.filter(
    (t) => t.status === "validated" && !paymentRequests.some((p) => p.fieldTicketId === t.id)
  );

  return (
    <div className="farm-page">
      <PageHeader title="Payment Requests" />

      {user && canSubmitFieldWork(user.role) && validated.length > 0 ? (
        <Card className="border-border/70 bg-card/90 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Bill validated tickets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {validated.map((t) => (
              <Button
                key={t.id}
                size="sm"
                className="gold-gradient text-primary-foreground hover:brightness-105"
                onClick={() => {
                  const r = submitPaymentRequest(t.id, user.email);
                  if (r.ok) toast.success("Payment request submitted");
                  else toast.error(r.error);
                }}
              >
                Bill {formatUsd(t.amountUsd)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <DataTableCard title="Payment request register">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentRequests.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell className="font-medium">{pr.id}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(pr.amountUsd)}</TableCell>
                <TableCell>
                  <StatusBadge status={pr.status} />
                </TableCell>
                <TableCell className="text-right">
                  {user && canValidateWork(user.role) && pr.status === "submitted" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        const r = approvePaymentRequest(pr.id, user.email);
                        if (r.ok) toast.success("Payment request approved");
                        else toast.error(r.error);
                      }}
                    >
                      Approve
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function SettlementsView() {
  const user = useAuthStore((s) => s.user);
  const paymentRequests = useFieldOsStore((s) => s.paymentRequests);
  const settlements = useFieldOsStore((s) => s.settlements);
  const releaseSettlement = useFieldOsStore((s) => s.releaseSettlement);
  const ready = paymentRequests.filter(
    (p) => p.status === "approved" && !settlements.some((s) => s.paymentRequestId === p.id)
  );

  return (
    <div className="farm-page">
      <PageHeader title="Owner Settlements" />

      {user?.role === "spx_principal" && ready.length > 0 ? (
        <Card className="border-border/70 bg-card/90 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Release settlement to Silva</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {ready.map((pr) => (
              <Button
                key={pr.id}
                size="sm"
                className="gold-gradient text-primary-foreground hover:brightness-105"
                onClick={() => {
                  const r = releaseSettlement(pr.id, "Released after SPX validation.");
                  if (r.ok) toast.success("Settlement released to owner");
                  else toast.error(r.error);
                }}
              >
                Release {formatUsd(pr.amountUsd)}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <DataTableCard title="Settlements (Silva-visible when released)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Released</TableHead>
              <TableHead>Narrative</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.id}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(s.amountUsd)}</TableCell>
                <TableCell>{s.releasedAt ?? "—"}</TableCell>
                <TableCell className="max-w-sm truncate text-sm text-muted-foreground">{s.narrative}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function BudgetView() {
  const afps = useFieldOsStore((s) => s.afps);
  const afp = afps[0];
  return (
    <div className="farm-page">
      <PageHeader title="Budget vs Actual" />
      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {afp?.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  {l.code} · {l.description}
                </TableCell>
                <TableCell className="text-right">{formatUsd(l.budgetUsd)}</TableCell>
                <TableCell className="text-right">{formatUsd(l.actualUsd)}</TableCell>
                <TableCell className="text-right font-medium">{formatUsd(l.budgetUsd - l.actualUsd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function VendorsView() {
  const vendors = useFieldOsStore((s) => s.vendors);
  return (
    <div className="farm-page">
      <PageHeader title="Vendor Register" />
      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Insurance</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.insuranceOnFile ? "On file" : "Missing"}</TableCell>
                <TableCell>{v.insuranceExpiresOn}</TableCell>
                <TableCell className="text-right">{v.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function RevenueLedgerView() {
  const user = useAuthStore((s) => s.user);
  const revenueLedger = useFieldOsStore((s) => s.revenueLedger);

  if (!user || !canSeeSpxRevenue(user.role)) {
    return (
      <div className="farm-page">
        <PageHeader title="SPX Revenue Ledger" />
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Revenue firewall</AlertTitle>
          <AlertDescription>
            SPX principal ledger is not visible to Silva or vendor desks.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="farm-page">
      <PageHeader title="SPX Revenue Ledger" />
      <p className="text-sm text-muted-foreground">Account Manager–only. Never joined into Silva/vendor views.</p>
      <Alert className="border-primary/20 bg-primary/5">
        <Shield className="h-4 w-4" />
        <AlertTitle>Firewall enforced</AlertTitle>
        <AlertDescription>This ledger is visible only on the SPX principal desk.</AlertDescription>
      </Alert>
      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Account Mgr</TableHead>
              <TableHead className="text-right">Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenueLedger.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.createdAt}</TableCell>
                <TableCell>{r.note}</TableCell>
                <TableCell className="text-right">{formatUsd(r.principalAmountUsd)}</TableCell>
                <TableCell className="text-right font-medium">{formatUsd(r.feeAmountUsd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function SeasonCalendarView() {
  const seasonEvents = useFieldOsStore((s) => s.seasonEvents);
  return (
    <div className="farm-page">
      <PageHeader title="Season Calendar" />
      <div className="grid gap-3 md:grid-cols-3">
        {seasonEvents.map((e) => (
          <Card key={e.id} className="farm-card-hover border-border/70 bg-card/90 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{e.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <Badge variant="secondary" className="mb-2">
                {e.kind}
              </Badge>
              <p>
                {e.startDate} → {e.endDate}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FieldFormsView() {
  const forms = [
    "Daily labor log",
    "Chemical application",
    "Harvest intake",
    "Equipment checklist",
    "Safety incident",
    "Block inspection",
    "Nursery transfer",
    "Water / irrigation",
    "Pest observation",
    "Material issue",
  ];
  return (
    <div className="farm-page">
      <PageHeader title="Field Forms (IFS subset)" />
      <p className="text-sm text-muted-foreground">
        Option 1: one shared form set. Vendors submit; SPX validates — no parallel B-Agro system.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((f) => (
          <Card key={f} className="farm-card-hover border-border/70 bg-card/90 p-4 shadow-card">
            <p className="font-medium">{f}</p>
            <p className="mt-1 text-xs text-muted-foreground">Shared instrument · vendor entry</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FieldReportsView() {
  return (
    <div className="farm-page">
      <PageHeader title="Reports" />
      <Card className="border-border/70 bg-card/90 p-6 shadow-card">
        <p className="font-medium">Schedule 5 cadence</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Weekly / monthly / quarterly / annual narratives are authored by SPX and released to Silva.
          Raw field tickets never appear on the owner desk.
        </p>
      </Card>
    </div>
  );
}
