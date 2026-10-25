"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ClipboardCheck, Plus, Search } from "lucide-react";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { listFarmAssessments } from "@/lib/api/farm-assessments";
import { canCreateProgrammePlan } from "@/lib/cropfort/platform-access";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Awaiting review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export default function FarmAssessmentsView() {
  const router = useRouter();
  const { activeProgram, user } = useCropfortAuth();
  const assessmentsQuery = useQuery({
    queryKey: ["farm-assessments", activeProgram?.id],
    queryFn: listFarmAssessments,
    enabled: Boolean(activeProgram?.id),
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const canCreate = canCreateProgrammePlan(user.role);
  const availablePlans = useMemo(
    () => (assessmentsQuery.data || []).filter((assessment) => !assessment.exists),
    [assessmentsQuery.data],
  );
  const plans = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = assessmentsQuery.data || [];
    if (!query) return rows;
    return rows.filter((plan) =>
      `${plan.planName} ${plan.farmName} ${plan.cycleLabel} ${STATUS_LABELS[plan.status]}`
        .toLowerCase()
        .includes(query),
    );
  }, [assessmentsQuery.data, search]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Workspace"}
        title="Farm Assessments"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning" },
          { label: "Farm Assessments" },
        ]}
        actions={canCreate ? (
          <Button
            onClick={() => {
              setSelectedPlanId(availablePlans[0]?.planId || "");
              setCreateOpen(true);
            }}
            disabled={assessmentsQuery.isPending || availablePlans.length === 0}
            title={availablePlans.length === 0 ? "Every Core Operations plan already has an assessment" : undefined}
          >
            <Plus className="size-4" aria-hidden />
            New assessment
          </Button>
        ) : null}
      />

      <SectionCard title="Choose Core Operations">
        <div className="mb-4 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Core Operations or farm…"
              className="pl-9"
              aria-label="Search farm assessments"
            />
          </div>
        </div>

        {assessmentsQuery.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">Loading Core Operations plans…</p>
        ) : assessmentsQuery.isError ? (
          <div className="space-y-3 py-6 text-center" role="alert">
            <p className="text-sm text-destructive">{assessmentsQuery.error.message}</p>
            <Button variant="outline" onClick={() => void assessmentsQuery.refetch()}>Retry</Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-10 text-center">
            <ClipboardCheck className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">{search ? "No matching Core Operations plans" : "No Core Operations plans available"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "Try a different search." : "Create a Core Operations plan before starting a farm assessment."}
            </p>
          </div>
        ) : (
          <div className="cf-table-scroll rounded-lg border">
            <Table aria-label="Core Operations farm assessments">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Core Operations</TableHead>
                  <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Farm area</TableHead>
                  <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planning cycle</TableHead>
                  <TableHead className="h-11 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assessment</TableHead>
                  <TableHead className="h-11 w-20 bg-muted/50" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => {
                  const href = `${CROPFORT_ROUTES.farmAssessments}/${encodeURIComponent(plan.planId)}`;
                  return (
                    <TableRow
                      key={plan.planId}
                      className="cursor-pointer border-b-border/70 odd:bg-background even:bg-muted/15 transition-colors hover:bg-primary/5"
                      tabIndex={0}
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("a, button")) return;
                        router.push(href);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(href);
                        }
                      }}
                    >
                      <TableCell className="min-w-[220px] py-3.5">
                        <Link
                          href={href}
                          className="rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {plan.planName}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-[150px] font-medium text-foreground/85">
                        {plan.farmName || "Farm not set"}
                      </TableCell>
                      <TableCell className="min-w-[190px] text-sm text-muted-foreground">
                        {plan.cycleLabel}
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <StatusBadge
                          status={plan.status}
                          label={plan.exists ? STATUS_LABELS[plan.status] : "Not started"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                          {plan.exists ? "Open" : "Start"}
                          <ArrowUpRight className="size-4" aria-hidden />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New farm assessment</DialogTitle>
            <DialogDescription>
              Choose the Core Operations plan for the farm and planning cycle you want to assess.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assessment-programme">
              Core Operations plan
            </label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="assessment-programme">
                <SelectValue placeholder="Choose a Core Operations plan" />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.planId} value={plan.planId}>
                    {plan.planName} · {plan.farmName || "Farm not set"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlanId ? (
              <p className="text-xs text-muted-foreground">
                {availablePlans.find((plan) => plan.planId === selectedPlanId)?.cycleLabel}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedPlanId}
              onClick={() => {
                setCreateOpen(false);
                router.push(`${CROPFORT_ROUTES.farmAssessments}/${encodeURIComponent(selectedPlanId)}`);
              }}
            >
              Start assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
