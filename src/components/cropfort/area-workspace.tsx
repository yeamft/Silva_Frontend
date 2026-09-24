"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ChevronRight,
  Construction,
  FileText,
  Filter,
  ListTodo,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CropfortAreaDef, CropfortInterfaceKind } from "@/config/cropfort-areas";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";

const DEMO_ROWS = [
  {
    id: "1",
    title: "Seed bed preparation",
    meta: "NUR-04 · Sheka · 6 ha",
    amount: "ETB 2,400",
    status: "draft",
  },
  {
    id: "2",
    title: "Infill hole digging",
    meta: "T1-032 · Sheka · planting point",
    amount: "ETB 17.5 / pt",
    status: "submitted",
  },
  {
    id: "3",
    title: "Pruning — canopy",
    meta: "CAN-12 · SH-01–03",
    amount: "ETB 18,400",
    status: "approved",
  },
];

function comingSoon(action: string) {
  toast.message(`${action} — coming next`, {
    description: "This screen shows the intended layout. Live actions wire up in the next build.",
  });
}

function SearchBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative max-w-md flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9 shadow-xs" placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

function DemoList({
  compact,
  clickable,
}: {
  compact?: boolean;
  clickable?: boolean;
}) {
  return (
    <ul className={cn("divide-y divide-border", compact && "text-sm")}>
      {DEMO_ROWS.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            disabled={!clickable}
            onClick={() => clickable && comingSoon(`Open ${row.title}`)}
            className={cn(
              "flex w-full items-center justify-between gap-3 px-1 py-3.5 text-left transition-colors",
              clickable && "hover:bg-muted/50 rounded-md px-2 -mx-1",
            )}
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.meta}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden text-xs font-medium tabular-nums text-muted-foreground sm:inline">
                {row.amount}
              </span>
              <StatusBadge status={row.status} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ShellChrome({
  area,
  children,
  primaryLabel,
}: {
  area: CropfortAreaDef;
  children: ReactNode;
  primaryLabel?: string;
}) {
  return (
    <PageContainer>
      <PageHeader
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label },
        ]}
        actions={
          primaryLabel ? (
            <Button size="sm" onClick={() => comingSoon(primaryLabel)}>
              {primaryLabel}
            </Button>
          ) : null
        }
      />
      <div className="space-y-5">{children}</div>
    </PageContainer>
  );
}

function HierarchyShell({ area }: { area: CropfortAreaDef }) {
  const levels = [
    { label: "Program", items: ["Sheka Program"] },
    { label: "Farm / estate", items: ["Sheka Estate", "Bench Estate"] },
    { label: "Farm area", items: ["North", "South"] },
    { label: "Blocks", items: ["SH-01", "SH-02", "SH-03", "SH-092"] },
  ];
  return (
    <ShellChrome area={area} primaryLabel="Add block">
      <div className="grid gap-4 lg:grid-cols-4">
        {levels.map((level) => (
          <SectionCard key={level.label} title={level.label} flush>
            <ul className="divide-y divide-border">
              {level.items.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                    onClick={() => comingSoon(`Select ${item}`)}
                  >
                    <span className="font-medium">{item}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Full edit tools:{" "}
        <Link className="font-medium text-foreground underline-offset-2 hover:underline" href={CROPFORT_ROUTES.farmMap}>
          Admin · Farm map
        </Link>
      </p>
    </ShellChrome>
  );
}

function SearchableListShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area}>
      <SearchBar placeholder={`Search ${area.label.toLowerCase()}…`} />
      <SectionCard title="Results" flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function WorkflowShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area} primaryLabel="Continue">
      <div className="flex flex-wrap gap-2">
        {["1 · Capture", "2 · Review", "3 · Lock"].map((step, i) => (
          <Button
            key={step}
            size="sm"
            variant={i === 0 ? "default" : "outline"}
            onClick={() => comingSoon(step)}
          >
            {step}
          </Button>
        ))}
      </div>
      <SectionCard title="Neighbor rates" description="Enter evidence, then lock the average">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background px-3 py-2 shadow-xs">
            <p className="text-xs text-muted-foreground">Neighbor east</p>
            <p className="cf-numeric text-lg font-semibold">ETB 12</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 shadow-xs">
            <p className="text-xs text-muted-foreground">Neighbor west</p>
            <p className="cf-numeric text-lg font-semibold">ETB 23</p>
          </div>
          <div className="rounded-md border border-primary/25 bg-primary/[0.04] px-3 py-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Recommended (AVG)</p>
            <p className="cf-numeric text-2xl font-semibold">ETB 17.5</p>
          </div>
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function CatalogShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area} primaryLabel="New from benchmark">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder="Filter catalog…" />
        <Button size="sm" variant="outline" onClick={() => comingSoon("Filters")}>
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>
      <SectionCard title="Catalog" flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function PlanningShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area} primaryLabel="Continue">
      <div className="flex flex-wrap gap-2">
        {["Setup", "Activities", "Calendar", "Review"].map((tab, i) => (
          <Button
            key={tab}
            size="sm"
            variant={i === 1 ? "default" : "outline"}
            onClick={() => comingSoon(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Activities" description="3 included · ETB 20,800" className="lg:col-span-2">
          <DemoList compact clickable />
        </SectionCard>
        <SectionCard title="Oct – Sep" description="Peak / Active / Light">
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
            {["O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S"].map((m, i) => (
              <button
                key={`${m}-${i}`}
                type="button"
                className={cn(
                  "rounded-md py-2.5 font-medium transition-colors",
                  i < 3 ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
                onClick={() => comingSoon(`Month ${m}`)}
              >
                {m}
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </ShellChrome>
  );
}

function ProjectShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area} primaryLabel="New project">
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Projects" className="lg:col-span-1" flush>
          <div className="px-4 sm:px-5">
            <DemoList compact clickable />
          </div>
        </SectionCard>
        <SectionCard
          title="Sheka nursery expansion"
          className="lg:col-span-2"
          description="Scope · budget · milestones"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="draft" />
              <span className="text-xs text-muted-foreground">Budget ETB 420,000 · Band B</span>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              Milestones and commercial agreement lines will appear here.
            </div>
          </div>
        </SectionCard>
      </div>
    </ShellChrome>
  );
}

function ActionShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area} primaryLabel="Start intervention">
      <SectionCard title="Active interventions">
        <DemoList compact clickable />
      </SectionCard>
      <SectionCard title="Action panel" description="One intervention at a time">
        <div className="rounded-md border border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          Select an intervention to see steps, rates, and sign-off.
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function DocumentShell({
  area,
  docLabel,
}: {
  area: CropfortAreaDef;
  docLabel: string;
}) {
  return (
    <ShellChrome area={area} primaryLabel={`Open ${docLabel}`}>
      <SectionCard title={`${docLabel} register`} flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
      <SectionCard title="Preview" description="Totals · sections · approval route">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Sheka · 2018/19 EC</p>
              <p className="text-xs text-muted-foreground">Band C · pending Silva · ETB 51,300</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["Nursery ETB 18,400", "Land prep ETB 22,100", "Canopy ETB 10,800"].map((line) => (
              <div
                key={line}
                className="rounded-md border border-border bg-background px-3 py-2 text-xs shadow-xs"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function ReviewQueueShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area}>
      <div className="flex flex-wrap gap-2">
        {["Rates", "AFPs", "AFEs"].map((tab, i) => (
          <Button
            key={tab}
            size="sm"
            variant={i === 0 ? "default" : "outline"}
            onClick={() => comingSoon(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>
      <SectionCard title="Awaiting your decision" description="Tap a row, then Approve or Reject" flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => comingSoon("Approve")}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => comingSoon("Reject")}>
          Reject
        </Button>
      </div>
    </ShellChrome>
  );
}

function OpsBoardShell({ area }: { area: CropfortAreaDef }) {
  const columns = ["Queued", "In progress", "Done"];
  return (
    <ShellChrome area={area} primaryLabel="Issue WO">
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <SectionCard key={col} title={col} flush>
            <ul className="space-y-2 p-3">
              {DEMO_ROWS.slice(0, 2).map((row) => (
                <li key={`${col}-${row.id}`}>
                  <button
                    type="button"
                    className="w-full rounded-md border border-border bg-background p-3 text-left text-sm shadow-xs transition-colors hover:bg-muted/40"
                    onClick={() => comingSoon(row.title)}
                  >
                    <p className="font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">{row.meta}</p>
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </ShellChrome>
  );
}

function MobileTaskShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area}>
      <div className="mx-auto w-full max-w-sm space-y-4">
        <SectionCard title="Today’s tasks" description="One job at a time">
          <ul className="space-y-2">
            {DEMO_ROWS.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full min-h-12 items-center justify-between rounded-lg border border-border bg-background px-3 py-3 text-left text-sm shadow-xs transition-colors hover:bg-muted/40"
                  onClick={() => comingSoon(row.title)}
                >
                  <span>
                    <span className="block font-medium">{row.title}</span>
                    <span className="text-xs text-muted-foreground">{row.meta}</span>
                  </span>
                  <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
        <Button className="w-full min-h-12" onClick={() => comingSoon("Start next task")}>
          Start next task
        </Button>
      </div>
    </ShellChrome>
  );
}

function ProgressShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area}>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Blocks on track", value: "6 / 8" },
          { label: "Activities done", value: "12 / 40" },
          { label: "Plan ETB spent", value: "38%" },
        ].map((kpi) => (
          <SectionCard key={kpi.label} title={kpi.label}>
            <p className="cf-numeric text-2xl font-semibold tracking-tight">{kpi.value}</p>
          </SectionCard>
        ))}
      </div>
      <SectionCard title="By block" flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function FinancialShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area}>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {["Program", "Sheka", "Nursery", "Oct"].map((crumb, i) => (
          <span key={crumb} className="inline-flex items-center gap-1 text-muted-foreground">
            {i > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
            <button
              type="button"
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground",
                i === 3 && "font-medium text-foreground",
              )}
              onClick={() => comingSoon(crumb)}
            >
              {crumb}
            </button>
          </span>
        ))}
      </div>
      <SectionCard title="Budget vs actual" description="Plan ETB 51,300 · Actual ETB 19,400">
        <div className="space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[38%] rounded-full bg-primary" />
          </div>
          <p className="text-xs text-muted-foreground">38% of annual plan spent</p>
        </div>
      </SectionCard>
      <SectionCard title="Lines" flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

function ReportShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area} primaryLabel="Release report">
      <SectionCard title="Weekly operations summary" description="Readable narrative for Silva">
        <article className="max-w-2xl space-y-4 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            Week of 15 Sep · Sheka Program · prepared by SPX
          </p>
          <div>
            <h3 className="mb-1 font-semibold text-foreground">Highlights</h3>
            <p className="text-muted-foreground">
              Nursery ran Peak intensity Oct–Dec. Band B AFEs auto-issued. Two rate cards returned for
              variance notes.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold text-foreground">Exceptions</h3>
            <p className="text-muted-foreground">
              SH-092 pruning slipped one week. No SPX margin figures on this surface.
            </p>
          </div>
        </article>
      </SectionCard>
    </ShellChrome>
  );
}

function TimelineShell({ area }: { area: CropfortAreaDef }) {
  const events = [
    { at: "2h ago", who: "SPX", what: "Submitted rate card T1-032", initial: "S" },
    { at: "Yesterday", who: "Silva", what: "Approved labor rate NUR-04", initial: "A" },
    { at: "Mon", who: "SPX", what: "Locked benchmark survey", initial: "S" },
  ];
  return (
    <ShellChrome area={area}>
      <SectionCard title="Audit timeline" flush>
        <ol className="relative ml-5 space-y-0 border-l border-border py-3">
          {events.map((e) => (
            <li key={e.at + e.what} className="relative pb-6 pl-6 last:pb-2">
              <span className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold shadow-xs">
                {e.initial}
              </span>
              <p className="pl-2 text-xs text-muted-foreground">
                {e.at} · {e.who}
              </p>
              <p className="pl-2 text-sm font-medium">{e.what}</p>
            </li>
          ))}
        </ol>
      </SectionCard>
    </ShellChrome>
  );
}

function LibraryShell({ area }: { area: CropfortAreaDef }) {
  return (
    <ShellChrome area={area}>
      <SearchBar placeholder="Search archive…" />
      <SectionCard title="Library" flush>
        <div className="px-4 sm:px-5">
          <DemoList clickable />
        </div>
      </SectionCard>
    </ShellChrome>
  );
}

const SHELL_BY_KIND: Record<
  Exclude<CropfortInterfaceKind, "attention_continue">,
  (props: { area: CropfortAreaDef }) => ReactNode
> = {
  hierarchy_explorer: HierarchyShell,
  searchable_list: SearchableListShell,
  focused_workflow: WorkflowShell,
  catalog: CatalogShell,
  planning_workspace: PlanningShell,
  project_workspace: ProjectShell,
  action_workspace: ActionShell,
  structured_document: (p) => <DocumentShell {...p} docLabel="AFP" />,
  authorization_document: (p) => <DocumentShell {...p} docLabel="AFE" />,
  review_queue: ReviewQueueShell,
  ops_board: OpsBoardShell,
  mobile_task: MobileTaskShell,
  progress_tracker: ProgressShell,
  financial_explorer: FinancialShell,
  readable_report: ReportShell,
  timeline: TimelineShell,
  searchable_library: LibraryShell,
};

export function CropfortAreaWorkspace({ area }: { area: CropfortAreaDef }) {
  if (area.interfaceKind === "attention_continue") {
    return (
      <PageContainer>
        <EmptyState
          icon={Construction}
          title="Use Home"
          description="Attention + continue-work lives on the Home screen."
          action={
            <Button size="sm" asChild>
              <Link href={CROPFORT_ROUTES.dashboard}>Go to Home</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }
  const Shell = SHELL_BY_KIND[area.interfaceKind];
  return <Shell area={area} />;
}

export function AreaWorkspaceById({ id }: { id: CropfortAreaDef["id"] }) {
  return <CropfortAreaWorkspace area={getCropfortArea(id)} />;
}
