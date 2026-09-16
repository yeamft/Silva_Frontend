"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Layers,
  MapPinned,
  Plus,
  RefreshCw,
  Sprout,
  TrendingUp,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import { formatEtb, useFarmStore } from "@/store/farmStore";
import type { ActivityStatus, ChangeStatus } from "@/types/farm";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<ActivityStatus, "secondary" | "default" | "outline" | "destructive"> = {
  planned: "secondary",
  in_progress: "default",
  completed: "outline",
  rolled_over: "secondary",
  cancelled: "destructive",
};

const CHANGE_VARIANT: Record<ChangeStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
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
  className,
  empty,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 bg-card/90 shadow-sm backdrop-blur-sm",
        className
      )}
    >
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

function StatusChip({
  icon: Icon,
  label,
  tone = "default",
}: {
  icon: typeof AlertTriangle;
  label: string;
  tone?: "default" | "warning" | "success" | "info";
}) {
  const tones = {
    default: "bg-secondary/80 text-foreground",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
  };
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl px-3.5 py-3", tones[tone])}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function FarmDashboardView() {
  const settings = useFarmStore((s) => s.settings);
  const blocks = useFarmStore((s) => s.blocks);
  const assignments = useFarmStore((s) => s.assignments);
  const planChanges = useFarmStore((s) => s.planChanges);
  const getFarmTotals = useFarmStore((s) => s.getFarmTotals);
  const getBlockBudget = useFarmStore((s) => s.getBlockBudget);
  const rolloverOverdue = useFarmStore((s) => s.rolloverOverdue);

  const totals = useMemo(
    () => getFarmTotals(),
    [getFarmTotals, blocks, assignments, planChanges]
  );

  const blockRows = useMemo(
    () =>
      blocks.map((b) => ({
        block: b,
        budget: getBlockBudget(b.id),
        open: assignments.filter((a) => a.blockId === b.id && a.progressPct < 100).length,
      })),
    [blocks, assignments, getBlockBudget]
  );

  return (
    <div className="farm-page">
      <PageHeader
        title={settings.farmName}
        action={
          <Button
            className="gap-2 gold-gradient text-primary-foreground shadow-sm hover:brightness-105"
            onClick={() => {
              const n = rolloverOverdue();
              toast.success(n ? `Rolled over ${n} overdue activities` : "No overdue activities");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Run day rollover
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active blocks" value={String(totals.blocksActive)} icon={MapPinned} />
        <MetricCard title="Avg progress" value={`${totals.avgProgress}%`} icon={TrendingUp} />
        <MetricCard title="Budget planned" value={formatEtb(totals.planned)} icon={ClipboardList} />
        <MetricCard title="Actual spend" value={formatEtb(totals.actual)} icon={Sprout} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DataTableCard title="Block progress" className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Block</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Open</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockRows.map(({ block, budget, open }) => (
                <TableRow key={block.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="font-medium">
                      {block.code} · {block.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {block.hectares} ha · {block.supervisorName}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[150px]">
                    <div className="space-y-1.5">
                      <Progress value={budget.progressPct} className="h-2.5" />
                      <span className="text-xs font-medium text-muted-foreground">{budget.progressPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{open}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEtb(budget.planned)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatEtb(budget.actual)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableCard>

        <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide">Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <StatusChip icon={AlertTriangle} label={`${totals.overdue} overdue`} tone="warning" />
            <StatusChip icon={CalendarClock} label={`${totals.pendingApprovals} pending`} tone="info" />
            <StatusChip
              icon={CheckCircle2}
              label={`${formatEtb(Math.max(0, totals.planned - totals.actual))} left`}
              tone="success"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function BlocksView() {
  const blocks = useFarmStore((s) => s.blocks);
  const upsertBlock = useFarmStore((s) => s.upsertBlock);
  const getBlockBudget = useFarmStore((s) => s.getBlockBudget);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    hectares: "1",
    location: "",
    cropVariety: "Heirloom",
    supervisorName: "",
  });

  const save = () => {
    if (!form.code || !form.name) return;
    upsertBlock({
      id: `blk-${Date.now()}`,
      code: form.code,
      name: form.name,
      hectares: Number(form.hectares) || 1,
      location: form.location,
      cropVariety: form.cropVariety,
      supervisorName: form.supervisorName || undefined,
      active: true,
    });
    toast.success("Block added");
    setOpen(false);
    setForm({ code: "", name: "", hectares: "1", location: "", cropVariety: "Heirloom", supervisorName: "" });
  };

  return (
    <div className="farm-page">
      <PageHeader
        title="Blocks / Plots"
        action={
          <Button className="gap-2 gold-gradient text-primary-foreground shadow-sm hover:brightness-105" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add block
          </Button>
        }
      />

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Ha</TableHead>
              <TableHead>Variety</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((b) => {
              const budget = getBlockBudget(b.id);
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.code}</TableCell>
                  <TableCell>
                    <div>{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.location}</div>
                  </TableCell>
                  <TableCell>{b.hectares}</TableCell>
                  <TableCell>{b.cropVariety}</TableCell>
                  <TableCell>{b.supervisorName ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatEtb(budget.planned)}</TableCell>
                  <TableCell className="text-right">{budget.progressPct}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add block</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="block-code">Code</Label>
                <Input id="block-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block-ha">Hectares</Label>
                <Input
                  id="block-ha"
                  type="number"
                  value={form.hectares}
                  onChange={(e) => setForm({ ...form, hectares: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-name">Name</Label>
              <Input id="block-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-location">Location</Label>
              <Input
                id="block-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-variety">Crop variety</Label>
              <Input
                id="block-variety"
                value={form.cropVariety}
                onChange={(e) => setForm({ ...form, cropVariety: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-supervisor">Supervisor</Label>
              <Input
                id="block-supervisor"
                value={form.supervisorName}
                onChange={(e) => setForm({ ...form, supervisorName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ActivityLibraryView() {
  const templates = useFarmStore((s) => s.activityTemplates);
  const laborRoles = useFarmStore((s) => s.laborRoles);
  const materials = useFarmStore((s) => s.materials);

  return (
    <div className="farm-page">
      <PageHeader title="Activity library" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="farm-card-hover border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.code}</p>
                  <CardTitle className="mt-1 text-base">{t.name}</CardTitle>
                </div>
                <Badge variant="secondary">{t.category}</Badge>
              </div>
              <p className="pt-1 text-sm text-muted-foreground">
                {t.baseDurationDays}d · {t.laborDaysPerHa} labor-days/ha
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Labor</p>
                <p>
                  {t.laborRoleIds
                    .map((id) => laborRoles.find((r) => r.id === id)?.name)
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Materials</p>
                <p className="text-muted-foreground">
                  {t.materialNeeds.length === 0
                    ? "None"
                    : t.materialNeeds
                        .map((m) => {
                          const mat = materials.find((x) => x.id === m.materialId);
                          return `${mat?.name ?? m.materialId} (${m.qtyPerHa}/${mat?.unit ?? "u"}/ha)`;
                        })
                        .join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BlockPlanningView() {
  const blocks = useFarmStore((s) => s.blocks);
  const templates = useFarmStore((s) => s.activityTemplates);
  const assignments = useFarmStore((s) => s.assignments);
  const assignActivity = useFarmStore((s) => s.assignActivity);
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [start, setStart] = useState(todayIso());

  const rows = assignments
    .filter((a) => a.blockId === blockId)
    .sort((a, b) => a.sequence - b.sequence);

  const add = () => {
    const created = assignActivity({ blockId, templateId, plannedStart: start });
    if (created) toast.success(`Assigned ${created.name}`);
  };

  return (
    <div className="farm-page">
      <PageHeader title="Block planning" />

      <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Assign activity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Block</Label>
            <Select value={blockId} onValueChange={setBlockId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} · {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Activity template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Planned start</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full gap-2 gold-gradient text-primary-foreground hover:brightness-105" onClick={add}>
              <Plus className="h-4 w-4" /> Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTableCard title="Plan sequence">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Labor</TableHead>
              <TableHead className="text-right">Materials</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.sequence}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-sm">
                  {a.plannedStart} → {a.plannedEnd}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[a.status]}>{a.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatEtb(a.plannedLaborCost)}</TableCell>
                <TableCell className="text-right">{formatEtb(a.plannedMaterialCost)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatEtb(a.plannedLaborCost + a.plannedMaterialCost)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No activities planned for this block.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function ProgressTrackingView() {
  const user = useAuthStore((s) => s.user);
  const blocks = useFarmStore((s) => s.blocks);
  const assignments = useFarmStore((s) => s.assignments);
  const progressEntries = useFarmStore((s) => s.progressEntries);
  const recordProgress = useFarmStore((s) => s.recordProgress);
  const openAssignments = assignments.filter((a) => a.progressPct < 100 && a.status !== "cancelled");
  const [assignmentId, setAssignmentId] = useState(openAssignments[0]?.id ?? "");
  const [date, setDate] = useState(todayIso());
  const [progressPct, setProgressPct] = useState("50");
  const [laborHours, setLaborHours] = useState("8");
  const [materialCost, setMaterialCost] = useState("0");
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!assignmentId) return;
    recordProgress({
      assignmentId,
      date,
      progressPct: Number(progressPct) || 0,
      laborHours: Number(laborHours) || 0,
      materialCost: Number(materialCost) || 0,
      notes,
      enteredBy: user?.name ?? "Supervisor",
    });
    toast.success("Progress recorded");
    setNotes("");
  };

  return (
    <div className="farm-page">
      <PageHeader title="Progress tracking" />

      <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Daily entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label>Activity</Label>
            <Select value={assignmentId} onValueChange={setAssignmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                {openAssignments.map((a) => {
                  const block = blocks.find((b) => b.id === a.blockId);
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      {block?.code} · {a.name} ({a.progressPct}%)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Progress %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={progressPct}
              onChange={(e) => setProgressPct(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Labor hours</Label>
            <Input type="number" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Material cost (ETB)</Label>
            <Input type="number" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full gold-gradient text-primary-foreground hover:brightness-105 sm:w-auto" onClick={save}>
            Save progress
          </Button>
        </CardFooter>
      </Card>

      <DataTableCard title="Recent entries">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Block / Activity</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Labor hrs</TableHead>
              <TableHead className="text-right">Materials</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {progressEntries.slice(0, 25).map((p) => {
              const a = assignments.find((x) => x.id === p.assignmentId);
              const b = blocks.find((x) => x.id === p.blockId);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {b?.code} · {a?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.notes}</div>
                  </TableCell>
                  <TableCell>{p.progressPct}%</TableCell>
                  <TableCell>{p.laborHours}</TableCell>
                  <TableCell className="text-right">{formatEtb(p.materialCost)}</TableCell>
                  <TableCell>{p.enteredBy}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function TimelineRolloverView() {
  const assignments = useFarmStore((s) => s.assignments);
  const blocks = useFarmStore((s) => s.blocks);
  const rolloverOverdue = useFarmStore((s) => s.rolloverOverdue);
  const today = todayIso();
  const overdue = assignments.filter(
    (a) => a.progressPct < 100 && a.plannedEnd < today && a.status !== "cancelled"
  );
  const rolled = assignments.filter((a) => a.status === "rolled_over");

  return (
    <div className="farm-page">
      <PageHeader
        title="Timeline & rollover"
        action={
          <Button
            className="gap-2"
            onClick={() => {
              const n = rolloverOverdue();
              toast.success(n ? `Rolled ${n} activities forward one day` : "Nothing to roll over");
            }}
          >
            <RefreshCw className="h-4 w-4" /> Run rollover
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <DataTableCard title={`Overdue now (${overdue.length})`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Planned end</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {blocks.find((b) => b.id === a.blockId)?.code}
                    </div>
                  </TableCell>
                  <TableCell>{a.plannedEnd}</TableCell>
                  <TableCell>{a.progressPct}%</TableCell>
                </TableRow>
              ))}
              {overdue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    All on schedule
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableCard>

        <DataTableCard title={`Already rolled (${rolled.length})`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>New end</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolled.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.plannedEnd}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
              {rolled.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    No rollovers yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataTableCard>
      </div>
    </div>
  );
}

export function ChangeApprovalsView() {
  const user = useAuthStore((s) => s.user);
  const changes = useFarmStore((s) => s.planChanges);
  const assignments = useFarmStore((s) => s.assignments);
  const blocks = useFarmStore((s) => s.blocks);
  const requestChange = useFarmStore((s) => s.requestChange);
  const reviewChange = useFarmStore((s) => s.reviewChange);

  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [newEnd, setNewEnd] = useState(todayIso());
  const [costDelta, setCostDelta] = useState("0");

  const submit = () => {
    const a = assignments.find((x) => x.id === assignmentId);
    if (!a || !reason) return;
    const durationDeltaDays = Math.max(
      0,
      Math.round((new Date(newEnd).getTime() - new Date(a.plannedEnd).getTime()) / 86400000)
    );
    requestChange({
      assignmentId,
      blockId: a.blockId,
      field: "plannedEnd",
      fromValue: a.plannedEnd,
      toValue: newEnd,
      reason,
      costDelta: Number(costDelta) || 0,
      durationDeltaDays,
      requestedBy: user?.name ?? "Manager",
    });
    toast.success("Change submitted");
    setReason("");
  };

  return (
    <div className="farm-page">
      <PageHeader title="Changes & approvals" />

      <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Request a change</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Activity</Label>
            <Select value={assignmentId} onValueChange={setAssignmentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {blocks.find((b) => b.id === a.blockId)?.code} · {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>New planned end</Label>
            <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cost delta (ETB)</Label>
            <Input type="number" value={costDelta} onChange={(e) => setCostDelta(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={submit}>Submit change</Button>
        </CardFooter>
      </Card>

      <DataTableCard title="Change log">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Change</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((c) => {
              const a = assignments.find((x) => x.id === c.assignmentId);
              const b = blocks.find((x) => x.id === c.blockId);
              return (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">
                    <div>{new Date(c.requestedAt).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{c.requestedBy}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {b?.code} · {a?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.field}: {c.fromValue} → {c.toValue}
                    </div>
                    <div className="mt-1 text-xs">{c.reason}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.durationDeltaDays ? `+${c.durationDeltaDays}d` : "0d"} · {formatEtb(c.costDelta)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={CHANGE_VARIANT[c.status]}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === "pending" && user?.role === "silva_owner" ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            reviewChange(c.id, "approved", user.name);
                            toast.success("Approved");
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            reviewChange(c.id, "rejected", user.name);
                            toast.message("Rejected");
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{c.reviewedBy ?? "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function LaborRatesView() {
  const roles = useFarmStore((s) => s.laborRoles);
  const upsertLaborRole = useFarmStore((s) => s.upsertLaborRole);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("250");

  return (
    <div className="farm-page">
      <PageHeader title="Labor rates" />

      <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Add labor role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" placeholder="Daily rate" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button
            className="gold-gradient text-primary-foreground hover:brightness-105"
            onClick={() => {
              if (!name) return;
              upsertLaborRole({
                id: `lr-${Date.now()}`,
                name,
                dailyRate: Number(rate) || 0,
                currency: "ETB",
                active: true,
              });
              setName("");
              toast.success("Labor role added");
            }}
          >
            Add role
          </Button>
        </CardContent>
      </Card>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Daily rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">{formatEtb(r.dailyRate)}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function MaterialsView() {
  const materials = useFarmStore((s) => s.materials);
  const upsertMaterial = useFarmStore((s) => s.upsertMaterial);
  const [form, setForm] = useState({ sku: "", name: "", unit: "kg", unitCost: "0", stockQty: "0" });

  return (
    <div className="farm-page">
      <PageHeader title="Materials" />

      <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Add material</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <Input
            type="number"
            placeholder="Unit cost"
            value={form.unitCost}
            onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
          />
          <Button
            className="gold-gradient text-primary-foreground hover:brightness-105"
            onClick={() => {
              if (!form.sku || !form.name) return;
              upsertMaterial({
                id: `mat-${Date.now()}`,
                sku: form.sku,
                name: form.name,
                unit: form.unit,
                unitCost: Number(form.unitCost) || 0,
                stockQty: Number(form.stockQty) || 0,
                currency: "ETB",
                active: true,
              });
              toast.success("Material added");
              setForm({ sku: "", name: "", unit: "kg", unitCost: "0", stockQty: "0" });
            }}
          >
            Add material
          </Button>
        </CardContent>
      </Card>

      <DataTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.sku}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell className="text-right">{formatEtb(m.unitCost)}</TableCell>
                <TableCell className="text-right">{m.stockQty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}

export function FarmReportsView() {
  const blocks = useFarmStore((s) => s.blocks);
  const assignments = useFarmStore((s) => s.assignments);
  const changes = useFarmStore((s) => s.planChanges);
  const getBlockBudget = useFarmStore((s) => s.getBlockBudget);
  const getFarmTotals = useFarmStore((s) => s.getFarmTotals);

  const totals = useMemo(
    () => getFarmTotals(),
    [getFarmTotals, blocks, assignments, changes]
  );

  const laborDays = useMemo(
    () => assignments.reduce((s, a) => s + a.actualLaborDays, 0),
    [assignments]
  );
  const plannedLaborDays = useMemo(
    () => assignments.reduce((s, a) => s + a.plannedLaborDays, 0),
    [assignments]
  );

  return (
    <div className="farm-page">
      <PageHeader title="Reports" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Farm planned" value={formatEtb(totals.planned)} icon={Layers} />
        <MetricCard title="Farm actual" value={formatEtb(totals.actual)} icon={Warehouse} />
        <MetricCard
          title="Labor days used"
          value={`${Math.round(laborDays)} / ${Math.round(plannedLaborDays)}`}
          icon={Users}
        />
        <MetricCard title="Change events" value={String(changes.length)} icon={ClipboardList} />
      </div>

      <DataTableCard title="Block budget vs actual">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Block</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((b) => {
              const budget = getBlockBudget(b.id);
              const variance = budget.actual - budget.planned;
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    {b.code} · {b.name}
                  </TableCell>
                  <TableCell className="text-right">{formatEtb(budget.planned)}</TableCell>
                  <TableCell className="text-right">{formatEtb(budget.actual)}</TableCell>
                  <TableCell
                    className={cn("text-right", variance > 0 ? "text-destructive" : "text-success")}
                  >
                    {formatEtb(variance)}
                  </TableCell>
                  <TableCell className="text-right">{budget.progressPct}%</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}
