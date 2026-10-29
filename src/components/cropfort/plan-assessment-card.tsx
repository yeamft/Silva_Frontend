"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Leaf, Link2Off, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import {
  createFarmAssessment,
  linkFarmAssessmentToPlan,
  listFarmAssessments,
  type AssessmentStatus,
} from "@/lib/api/farm-assessments";

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  changes_requested: "Changes requested",
};

/**
 * Attach a farm assessment to the plan before it is submitted: pick one of this farm's
 * assessments, or start a new one already linked to the plan.
 */
export function PlanAssessmentCard({
  planId,
  farmEstateId,
  planYear,
  canEdit,
}: {
  planId: string;
  farmEstateId: string;
  planYear: number;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const { activeProgram, user } = useCropfortAuth();
  const [choice, setChoice] = useState("");

  const query = useQuery({
    queryKey: ["farm-assessments", activeProgram?.id, "farm", farmEstateId],
    queryFn: () => listFarmAssessments({ farmEstateId }),
    enabled: Boolean(activeProgram?.id && farmEstateId),
  });
  const assessments = query.data ?? [];
  const linked = assessments.find((a) => a.planId === planId);
  const others = assessments.filter((a) => a.planId !== planId);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["farm-assessments"] });
  const link = useMutation({
    mutationFn: (id: string) => linkFarmAssessmentToPlan(id, planId),
    onSuccess: () => {
      toast.success("Farm assessment added to the plan");
      setChoice("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const unlink = useMutation({
    mutationFn: (id: string) => linkFarmAssessmentToPlan(id, null),
    onSuccess: () => {
      toast.success("Farm assessment removed from the plan");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const create = useMutation({
    mutationFn: () =>
      createFarmAssessment({
        farmEstateId,
        planId,
        planYear,
        planningCycle: `${planYear} Programme`,
        assessmentDate: new Date().toISOString().slice(0, 10),
        assessorName: user.name,
        assessorUserId: user.id,
        assessmentPurpose: "annual_baseline",
      }),
    onSuccess: () => {
      toast.success("New farm assessment added — open it to fill in the findings");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const busy = link.isPending || unlink.isPending || create.isPending;

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          <Leaf className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Farm assessment</h3>
          <p className="text-xs text-muted-foreground">Optional — gives the asset owner the field findings behind this plan.</p>
        </div>
      </div>

      {query.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : linked ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{linked.title}</span>
          <Badge variant={linked.status === "approved" ? "default" : "secondary"}>{STATUS_LABEL[linked.status]}</Badge>
          <Button size="sm" variant="outline" asChild>
            <Link href={`${CROPFORT_ROUTES.farmAssessments}/${linked.id}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Open
            </Link>
          </Button>
          {canEdit ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => unlink.mutate(linked.id)}>
              <Link2Off className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>
      ) : canEdit ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {others.length ? (
            <>
              <Select value={choice} onValueChange={setChoice}>
                <SelectTrigger className="h-10 sm:flex-1">
                  <SelectValue placeholder="Choose an assessment for this farm" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title} · {STATUS_LABEL[a.status]}
                      {a.planName ? ` · on ${a.planName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={!choice || busy} onClick={() => link.mutate(choice)}>
                Add
              </Button>
              <span className="text-center text-xs text-muted-foreground">or</span>
            </>
          ) : null}
          <Button variant="outline" disabled={busy} onClick={() => create.mutate()}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New assessment
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No farm assessment attached.</p>
      )}
    </section>
  );
}
