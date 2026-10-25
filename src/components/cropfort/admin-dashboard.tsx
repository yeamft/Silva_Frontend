"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ClipboardList, FileText, Leaf, Map, MapPin, Network, Ticket, Users, Wrench, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useWorkOrders, mapTicketDto } from "@/lib/query/hooks/use-work-orders";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { useBlocks, useFarmAreas } from "@/lib/query/hooks/use-org-map";
import { dashboardExecution, dashboardProgress, dashboardSchedule } from "@/lib/cropfort/admin-dashboard";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";
import { CROPFORT_ROUTES as routes } from "@/config/navigation-routes";
import { cn } from "@/lib/utils";

const chartConfig = {
  workOrders: { label: "Work orders", color: "#22a447" },
  tickets: { label: "Tickets", color: "#fbbf24" },
} satisfies ChartConfig;

const tones = {
  green: { card: "border-emerald-100 dark:border-emerald-900/50", icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400", dot: "bg-emerald-500" },
  orange: { card: "border-orange-100 dark:border-orange-900/50", icon: "bg-orange-50 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400", dot: "bg-orange-500" },
  blue: { card: "border-sky-100 dark:border-sky-900/50", icon: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400", dot: "bg-sky-500" },
  purple: { card: "border-violet-100 dark:border-violet-900/50", icon: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400", dot: "bg-violet-500" },
};
type Tone = keyof typeof tones;

function Metric({ label, value, hint, icon: Icon, tone, href }: {
  label: string; value: string | number; hint: string; icon: LucideIcon; tone: Tone; href: string;
}) {
  return <Link href={href} className="group min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <Card className={cn("h-full rounded-2xl bg-card/95 transition-shadow group-hover:shadow-md", tones[tone].card)}>
      <CardContent className="flex gap-4 p-5">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tones[tone].icon)}><Icon className="size-6" aria-hidden /></span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("size-2 shrink-0 rounded-full", tones[tone].dot)} aria-hidden />{hint}</p>
        </div>
      </CardContent>
    </Card>
  </Link>;
}

function Panel({ title, href, action = "View all", children, className, control }: {
  title: string; href?: string; action?: string; children: ReactNode; className?: string; control?: ReactNode;
}) {
  return <Card className={cn("min-w-0 rounded-2xl border-border/70 bg-card/95", className)}>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-5 pb-3">
      <CardTitle className="text-base tracking-tight">{title}</CardTitle>
      {control || (href && <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-1 text-xs font-normal"><Link href={href}>{action}<ArrowRight className="size-3.5" aria-hidden /></Link></Button>)}
    </CardHeader>
    <CardContent className="p-5 pt-0">{children}</CardContent>
  </Card>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="flex min-h-28 items-center justify-center px-3 py-6 text-center text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function LoadingRows() {
  return <div role="status" className="space-y-4 py-3"><span className="sr-only">Loading dashboard information</span>{[1, 2, 3].map((key) => <Skeleton key={key} className="h-12 w-full rounded-xl" />)}</div>;
}

function relativeTime(iso: string, now: Date) {
  const date = new Date(iso);
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export function AdminDashboard() {
  const { activeProgram, programs } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);
  const ordersQuery = useWorkOrders(enabled);
  const afesQuery = useAfes(enabled);
  const plansQuery = useProgrammePlans(enabled);
  const farmsQuery = useFarmAreas(enabled);
  const blocksQuery = useBlocks(enabled);
  const [months, setMonths] = useState("6");
  const [now] = useState(() => new Date());
  const orders = ordersQuery.data || [];
  const afes = afesQuery.data || [];
  const plans = plansQuery.data || [];
  const tickets = orders.flatMap((order) => (order.tickets || []).map((ticket) => mapTicketDto(ticket, order)));
  const waiting = tickets.filter((ticket) => ticketWaitingOn(ticket.status) !== null);
  const pendingAfes = afes.filter((afe) => afe.status === "submitted");
  const progress = dashboardProgress(orders);
  const activities = plans.flatMap((plan) => Object.values(plan.activities || {}).filter((activity) => activity.included));
  const scheduled = activities.filter((activity) => Object.values(activity.intensities || {}).some((intensity) => intensity && intensity !== "none")).length;
  const schedule = useMemo(() => dashboardSchedule(plansQuery.data || [], now), [plansQuery.data, now]);
  const execution = useMemo(() => dashboardExecution(ordersQuery.data || [], Number(months), now), [ordersQuery.data, months, now]);
  const ordersReady = enabled && ordersQuery.isSuccess && !ordersQuery.isError;
  const afesReady = enabled && afesQuery.isSuccess && !afesQuery.isError;
  const plansReady = enabled && plansQuery.isSuccess && !plansQuery.isError;
  const farmsReady = enabled && farmsQuery.isSuccess && !farmsQuery.isError;
  const blocksReady = enabled && blocksQuery.isSuccess && !blocksQuery.isError;
  const ready = ordersReady && afesReady;
  const loading = ordersQuery.isLoading || afesQuery.isLoading;
  const failed = [
    { label: "work orders", query: ordersQuery }, { label: "expenditure requests", query: afesQuery },
    { label: "Core Operations plans", query: plansQuery }, { label: "estates", query: farmsQuery }, { label: "blocks", query: blocksQuery },
  ].filter(({ query }) => query.isError);
  const pendingCount = waiting.length + pendingAfes.length;
  const attentionHref = waiting.length === 1
    ? `${routes.fieldTickets}?ticket=${encodeURIComponent(waiting[0].id)}`
    : waiting.length ? routes.fieldTickets : routes.approvals;
  const activityReady = ordersReady && afesReady && plansReady;
  const activity = [
    ...orders.flatMap((order) => (order.tickets || []).map((ticket) => ({
      id: `ticket-${ticket.id}`, title: ticket.activityRecorded || ticket.id.slice(0, 8),
      detail: `Field ticket · ${ticket.status.replace(/_/g, " ")}`, at: ticket.updatedAt || ticket.createdAt,
      href: `${routes.fieldTickets}?ticket=${encodeURIComponent(ticket.id)}`, tone: "orange" as Tone,
    }))),
    ...orders.map((order) => ({ id: `order-${order.id}`, title: order.title || order.code, detail: `Work order · ${order.status.replace(/_/g, " ")}`, at: order.updatedAt || order.createdAt, href: routes.workOrders, tone: "blue" as Tone })),
    ...plans.map((plan) => ({ id: `plan-${plan.id}`, title: plan.name || plan.code || "Core Operations plan", detail: `Core Operations · ${plan.status.replace(/_/g, " ")}`, at: plan.updatedAt || plan.createdAt || "", href: `${routes.programmePlans}/${encodeURIComponent(plan.id)}`, tone: "green" as Tone })),
    ...afes.map((afe) => ({ id: `afe-${afe.id}`, title: afe.title, detail: `Expenditure request · ${afe.status}`, at: afe.updatedAt || afe.createdAt, href: routes.afe, tone: "purple" as Tone })),
  ].filter((item) => item.at && Number.isFinite(new Date(item.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 4);
  const count = (value: number, available: boolean) => available ? value : "—";
  const position = [
    { label: "With vendor", icon: Users, value: waiting.filter((ticket) => ticketWaitingOn(ticket.status) === "vendor").length, tone: "blue" as Tone },
    { label: "With site reviewer", icon: MapPin, value: waiting.filter((ticket) => ticketWaitingOn(ticket.status) === "site_owner").length, tone: "blue" as Tone },
    { label: "With asset owner", icon: Leaf, value: waiting.filter((ticket) => ticketWaitingOn(ticket.status) === "asset_owner").length, tone: "green" as Tone },
    { label: "Open work orders", icon: Wrench, value: progress.open, tone: "blue" as Tone },
  ];

  return <div className="min-h-full bg-emerald-50/30 dark:bg-background">
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 sm:px-6 lg:px-7">
      <header className="relative isolate flex min-h-36 flex-col justify-center gap-4 overflow-hidden rounded-2xl bg-card p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[55%] sm:block" aria-hidden>
          <Image src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=75" alt="" fill sizes="(min-width: 1280px) 700px, 55vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/65 to-card/5 dark:to-card/40" />
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">{activeProgram?.name || "Core Operations overview"}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" aria-hidden />Core Operations overview</span>
            <span className="inline-flex items-center gap-2"><Network className="size-4 text-muted-foreground" aria-hidden />{count(farmsQuery.data?.length || 0, farmsReady)} estates</span>
            <span className="inline-flex items-center gap-2"><Map className="size-4 text-muted-foreground" aria-hidden />{count(blocksQuery.data?.length || 0, blocksReady)} blocks</span>
          </div>
        </div>
        <Button variant="outline" asChild className="h-11 shrink-0 gap-3 self-start rounded-xl bg-card shadow-sm lg:self-center"><Link href={routes.programmePlans}>View Core Operations<ArrowRight className="size-4" aria-hidden /></Link></Button>
      </header>

      {!enabled && <Alert><AlertDescription>Select an active workspace from the header to see its dashboard.</AlertDescription></Alert>}
      {enabled && failed.length > 0 && <Alert variant="destructive"><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>Couldn’t load {failed.map(({ label }) => label).join(", ")}. Affected totals are unavailable.</span><Button variant="outline" size="sm" disabled={failed.some(({ query }) => query.isFetching)} onClick={() => { void Promise.all(failed.map(({ query }) => query.refetch())); }}>Retry</Button></AlertDescription></Alert>}

      <section aria-label="Needs attention" aria-live="polite" className={cn("flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between", ready && pendingCount ? "border-amber-200/60 bg-amber-50/90 dark:border-amber-900 dark:bg-amber-950/25" : "border-emerald-100 bg-card dark:border-border")}>
        <div className="flex items-center gap-4">
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", ready && pendingCount ? "bg-amber-100 text-amber-500 dark:bg-amber-900/40" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950")}>
            {ready && pendingCount === 0 ? <CheckCircle2 className="size-6" aria-hidden /> : <Bell className="size-6" aria-hidden />}
          </span>
          <div><h2 className="text-base font-semibold">{!enabled ? "Your Core Operations at a glance" : loading ? "Checking pending work…" : !ready ? "Pending work is unavailable" : waiting.length ? `${waiting.length} ${waiting.length === 1 ? "ticket awaits" : "tickets await"} action` : pendingAfes.length ? `${pendingAfes.length} expenditure ${pendingAfes.length === 1 ? "request awaits" : "requests await"} approval` : "You’re all caught up"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{!enabled ? "Choose a workspace to get started." : !ready ? "Your latest work will appear when the data loads." : pendingCount ? "Review the details and follow up on the next step." : "No tickets or expenditure requests are waiting for action."}</p>
          </div>
        </div>
        {ready && pendingCount > 0 && <Button asChild className="h-11 gap-3 rounded-xl bg-amber-500 px-5 text-slate-950 hover:bg-amber-400"><Link href={attentionHref}>{waiting.length ? waiting.length === 1 ? "Review ticket" : "Review tickets" : "View approvals"}<ArrowRight className="size-4" aria-hidden /></Link></Button>}
      </section>

      <section aria-label="Core Operations metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active Core Operations" value={programs.filter((program) => program.status === "active").length} hint="Across your workspaces" icon={BriefcaseBusiness} tone="green" href={routes.programs} />
        <Metric label="Open tickets" value={count(waiting.length, ordersReady)} hint={!ordersReady ? "Awaiting data" : waiting.length ? "Needs action" : "No open tickets"} icon={Ticket} tone="orange" href={routes.fieldTickets} />
        <Metric label="Open work orders" value={count(progress.open, ordersReady)} hint={!ordersReady ? "Awaiting data" : progress.open ? "Work to complete" : "No open orders"} icon={Wrench} tone="blue" href={routes.workOrders} />
        <Metric label="Pending AFEs" value={count(pendingAfes.length, afesReady)} hint={!afesReady ? "Awaiting data" : pendingAfes.length ? "Expenditure approvals" : "No pending approvals"} icon={FileText} tone="purple" href={routes.approvals} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel title="Core Operations progress" href={routes.programmePlans} action="View plans">
          {ordersQuery.isLoading ? <Skeleton className="my-4 h-5 w-full" /> : ordersReady && progress.percent !== null ? <>
            <div className="mt-2 flex items-center gap-4"><Progress value={progress.percent} aria-label="Work orders completed" aria-valuenow={progress.percent} className="h-4 flex-1 bg-muted [&>div]:rounded-full [&>div]:bg-emerald-500" /><span className="shrink-0 text-sm font-medium">{progress.percent}% complete</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{progress.completed} of {progress.total} work orders completed</p>
          </> : <p className="py-3 text-sm text-muted-foreground">{ordersReady ? "No work orders yet. Progress appears when work is created." : "Progress will appear when work orders are available."}</p>}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Estates", icon: Network, value: count(farmsQuery.data?.length || 0, farmsReady), tone: "blue" as Tone },
              { label: "Blocks", icon: Map, value: count(blocksQuery.data?.length || 0, blocksReady), tone: "blue" as Tone },
              { label: "Planned activities", icon: ClipboardList, value: count(activities.length, plansReady), tone: "orange" as Tone },
              { label: "Scheduled activities", icon: CheckCircle2, value: count(scheduled, plansReady), tone: "green" as Tone },
            ].map(({ label, icon: Icon, value, tone }) => <div key={label} className="flex items-start gap-2.5"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tones[tone].icon)}><Icon className="size-4" aria-hidden /></span><div><p className="text-lg font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>)}
          </div>
        </Panel>
        <Panel title="Position" href={routes.fieldTickets}>
          <div className="grid gap-2 sm:grid-cols-2">{position.map(({ label, icon: Icon, value, tone }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tones[tone].icon)}><Icon className="size-5" aria-hidden /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold leading-none tabular-nums">{count(value, ordersReady)}</p></div></div>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">Tickets grouped by who needs to respond.</p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Panel title="Upcoming schedule" href={routes.programmePlans} action="View plans">
          <p className="mb-3 text-xs text-muted-foreground">This month and ahead · monthly plan intensity</p>
          {plansQuery.isLoading ? <LoadingRows /> : !plansReady ? <Empty>Schedule information is unavailable.</Empty> : !schedule.length ? <Empty>No upcoming activities are scheduled. Add a schedule to a Core Operations plan.</Empty> : <ul className="space-y-3">{schedule.slice(0, 4).map((item) => <li key={item.id}>
            <Link href={`${routes.programmePlans}/${encodeURIComponent(item.planId)}`} className="flex items-center gap-3 rounded-lg transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-amber-50 px-1 py-2 text-amber-950 dark:bg-amber-950/30 dark:text-amber-200"><span className="text-[10px] uppercase">{item.month}</span><span className="text-sm font-semibold">{item.year}</span></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{item.detail || "Core Operations activity"}</span></span>
              <Badge variant="secondary" className={cn("shrink-0 rounded-xl border-0 px-2 py-1 text-[10px] font-medium capitalize", item.intensity === "peak" ? tones.orange.icon : item.intensity === "active" ? tones.green.icon : tones.blue.icon)}>{item.intensity}</Badge>
            </Link>
          </li>)}</ul>}
        </Panel>
        <Panel title="Execution" control={<Select value={months} onValueChange={setMonths}><SelectTrigger aria-label="Execution chart period" className="h-8 w-32 rounded-lg text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">Last 3 months</SelectItem><SelectItem value="6">Last 6 months</SelectItem><SelectItem value="12">Last 12 months</SelectItem></SelectContent></Select>}>
          <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-500" aria-hidden />Work orders</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-400" aria-hidden />Tickets</span></div>
          {ordersQuery.isLoading ? <LoadingRows /> : !ordersReady ? <Empty>Execution information is unavailable.</Empty> : !execution.some((month) => month.workOrders || month.tickets) ? <Empty>No work orders or tickets were created in this period.</Empty> : <>
            <ChartContainer config={chartConfig} className="h-48 w-full aspect-auto">
              <BarChart accessibilityLayer data={execution} margin={{ left: -20, right: 0, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} fontSize={11} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="workOrders" fill="var(--color-workOrders)" radius={[4, 4, 0, 0]} maxBarSize={18} /><Bar dataKey="tickets" fill="var(--color-tickets)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ChartContainer>
            <ul className="sr-only" aria-label="Execution counts by month">{execution.map((month) => <li key={month.key}>{month.period}: {month.workOrders} work orders, {month.tickets} tickets.</li>)}</ul>
          </>}
          <p className="mt-3 text-xs text-muted-foreground">New work orders and tickets by creation month.</p>
        </Panel>
        <Panel title="Recent activity" href={routes.auditTrail} className="lg:col-span-2 2xl:col-span-1">
          {ordersQuery.isLoading || afesQuery.isLoading || plansQuery.isLoading ? <LoadingRows /> : !activityReady ? <Empty>Recent activity is unavailable until the records load.</Empty> : !activity.length ? <Empty>No recent activity. Core Operations updates will appear here.</Empty> : <ul className="space-y-4 py-1">{activity.map((item) => <li key={item.id}>
            <Link href={item.href} className="flex items-start gap-3 rounded-md py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", tones[item.tone].dot)} aria-hidden />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-1 block truncate text-xs leading-relaxed text-muted-foreground">{item.detail}</span></span>
              <time dateTime={item.at} title={new Date(item.at).toLocaleString()} className="mt-0.5 shrink-0 text-[10px] text-muted-foreground">{relativeTime(item.at, now)}</time>
            </Link>
          </li>)}</ul>}
        </Panel>
      </div>
    </div>
  </div>;
}
