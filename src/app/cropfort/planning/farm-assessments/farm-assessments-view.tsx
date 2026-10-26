"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ClipboardCheck, FileEdit, Plus, Search, ThumbsUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { CompactSummaryCards, PageContainer, PageHeader, SectionCard, EmptyState } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  listFarmAssessments, getAssessmentCounts, createFarmAssessment,
  type FarmAssessmentSummary, type AssessmentStatus, type CreateAssessmentBody,
} from "@/lib/api/farm-assessments";
import { canCreateProgrammePlan, isBagroDesk } from "@/lib/cropfort/platform-access";

const STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

const PURPOSE_LABELS: Record<string, string> = {
  annual_baseline: "Annual baseline",
  follow_up: "Follow-up",
  special: "Special",
};

function canCreateAssessment(role: string) {
  return canCreateProgrammePlan(role) || isBagroDesk(role);
}

export default function FarmAssessmentsView() {
  const router = useRouter();
  const { activeProgram, user } = useCropfortAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(activeProgram?.id);

  const countsQuery = useQuery({
    queryKey: ["farm-assessments-counts", activeProgram?.id],
    queryFn: getAssessmentCounts,
    enabled,
  });

  const [filters, setFilters] = useState<{
    status: AssessmentStatus | "";
    search: string;
  }>({ status: "", search: "" });

  const search = useDebouncedValue(filters.search.trim(), 300);
  const listQuery = useQuery({
    queryKey: ["farm-assessments", activeProgram?.id, filters.status, search],
    queryFn: () => listFarmAssessments({
      status: filters.status || undefined,
      search: search || undefined,
    }),
    enabled,
  });

  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Workspace"}
        title="Farm Assessments"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.coreOperations },
          { label: "Farm Assessments" },
        ]}
        meta={undefined}
        actions={canCreateAssessment(user.role) ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New Assessment
          </Button>
        ) : null}
      />

      <CompactSummaryCards
        label="Assessment summary"
        items={(
          [
            { id: "draft", label: "Draft", icon: FileEdit },
            { id: "submitted", label: "Awaiting review", icon: Clock },
            { id: "changes_requested", label: "Changes requested", icon: AlertCircle },
            { id: "approved", label: "Approved", icon: ThumbsUp },
          ] as const
        ).map((card) => ({
          ...card,
          value: String(countsQuery.data?.[card.id] ?? "—"),
          active: filters.status === card.id,
          onClick: () => setFilters((f) => ({ ...f, status: f.status === card.id ? "" : card.id })),
        }))}
      />

      <SectionCard
        title="Assessments"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search title or farm"
                className="h-8 w-52 pl-9 text-sm"
                aria-label="Search farm assessments"
              />
            </div>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v as AssessmentStatus }))}
            >
              <SelectTrigger className="h-8 w-40 text-sm" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Awaiting review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="changes_requested">Changes requested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        flush
      >
        {listQuery.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">Loading assessments…</p>
        ) : listQuery.isError ? (
          <div className="space-y-3 py-6 text-center" role="alert">
            <p className="text-sm text-destructive">{listQuery.error.message}</p>
            <Button variant="outline" onClick={() => void listQuery.refetch()}>Retry</Button>
          </div>
        ) : listQuery.data?.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title={filters.status || search ? "No matching assessments" : "No farm assessments yet"}
            description={filters.status || search ? "No assessments match these filters." : "Create an assessment to record farm conditions and operational recommendations."}
            action={canCreateAssessment(user.role) ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                New Assessment
              </Button>
            ) : undefined}
          />
        ) : (
          <AssessmentTable rows={listQuery.data ?? []} onOpen={(id) => router.push(`${CROPFORT_ROUTES.farmAssessments}/${encodeURIComponent(id)}`)} />
        )}
      </SectionCard>

      <NewAssessmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          void queryClient.invalidateQueries({ queryKey: ["farm-assessments"] });
          void queryClient.invalidateQueries({ queryKey: ["farm-assessments-counts"] });
          router.push(`${CROPFORT_ROUTES.farmAssessments}/${encodeURIComponent(id)}`);
        }}
      />
    </PageContainer>
  );
}

// ── Assessment table ───────────────────────────────────────────────────────

function AssessmentTable({ rows, onOpen }: { rows: FarmAssessmentSummary[]; onOpen: (id: string) => void }) {
  return (
    <Table aria-label="Farm assessments">
      <TableHeader>
        <TableRow>
          <TableHead>Assessment</TableHead>
          <TableHead>Farm area</TableHead>
          <TableHead className="text-right">Area (ha)</TableHead>
          <TableHead className="text-right">Recommendations</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Linked plan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => onOpen(row.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(row.id); } }}
          >
            <TableCell className="min-w-[220px] py-3">
              <p className="font-medium leading-snug text-foreground">{row.title || "Untitled assessment"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[
                  row.assessmentPurpose ? PURPOSE_LABELS[row.assessmentPurpose] ?? row.assessmentPurpose : null,
                  row.cycleLabel,
                  row.assessmentDate ? new Date(row.assessmentDate).toLocaleDateString() : null,
                ].filter(Boolean).join(" · ")}
              </p>
            </TableCell>
            <TableCell className="min-w-[140px]">{row.farmName || "—"}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {row.assessedAreaHa != null ? row.assessedAreaHa.toFixed(1) : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{row.recommendationsCount}</TableCell>
            <TableCell className="min-w-[140px]">
              <StatusBadge status={row.status} label={STATUS_LABELS[row.status]} />
            </TableCell>
            <TableCell className="min-w-[160px] text-sm text-muted-foreground">{row.planName || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── New assessment dialog ──────────────────────────────────────────────────

type FarmOption = { id: string; name: string; totalAreaHa?: number | null };

function NewAssessmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { activeProgram, user } = useCropfortAuth();
  const [farmEstateId, setFarmEstateId] = useState("");
  const [planYear, setPlanYear] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("annual_baseline");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  // Load farm areas for the active program
  const farmsQuery = useQuery({
    queryKey: ["farm-estates-list", activeProgram?.id],
    queryFn: () => import("@/lib/api/http").then(({ apiFetch }) =>
      apiFetch<FarmOption[]>(`/farms?programId=${activeProgram?.id}`),
    ),
    enabled: open && Boolean(activeProgram?.id),
  });

  const farms: FarmOption[] = farmsQuery.data ?? [];
  const selectedFarm = farms.find((f) => f.id === farmEstateId);

  // Auto-generate title when farm or year changes (unless user has typed their own)
  const autoTitle = useMemo(() => {
    const farm = selectedFarm?.name || "";
    const cycle = planYear ? `${planYear} Programme` : "";
    if (farm && cycle) return `${farm} Annual Farm Assessment ${cycle}`;
    if (farm) return `${farm} Annual Farm Assessment`;
    return "";
  }, [selectedFarm, planYear]);

  const displayTitle = titleTouched ? title : autoTitle;

  const mutation = useMutation({
    mutationFn: (body: CreateAssessmentBody) => createFarmAssessment(body),
    onSuccess: (assessment) => {
      toast.success("Assessment created");
      onOpenChange(false);
      onCreated(assessment.id);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit() {
    if (!farmEstateId) return;
    mutation.mutate({
      farmEstateId,
      planYear: planYear ? Number(planYear) : undefined,
      planningCycle: planYear ? `${planYear} Programme` : undefined,
      title: displayTitle || undefined,
      assessmentDate: new Date().toISOString().slice(0, 10),
      assessorName: user.name,
      assessorUserId: user.id,
      assessmentPurpose: purpose as CreateAssessmentBody["assessmentPurpose"],
    });
  }

  function handleClose() {
    if (mutation.isPending) return;
    onOpenChange(false);
    setFarmEstateId("");
    setPlanYear("");
    setPurpose("annual_baseline");
    setTitle("");
    setTitleTouched(false);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Farm Assessment</DialogTitle>

        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="na-farm">Farm area <span aria-hidden className="text-destructive">*</span></Label>
            <Select value={farmEstateId} onValueChange={setFarmEstateId}>
              <SelectTrigger id="na-farm">
                <SelectValue placeholder={farmsQuery.isPending ? "Loading…" : "Select farm area"} />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-year">Planning year</Label>
            <Select value={planYear} onValueChange={setPlanYear}>
              <SelectTrigger id="na-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y} Programme</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-purpose">Assessment purpose</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger id="na-purpose">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual_baseline">Annual baseline</SelectItem>
                <SelectItem value="follow_up">Follow-up assessment</SelectItem>
                <SelectItem value="special">Special assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="na-title">Assessment title</Label>
            <Input
              id="na-title"
              value={displayTitle}
              onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
              placeholder="Auto-generated from farm and year"
              maxLength={300}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!farmEstateId || mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create Assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
