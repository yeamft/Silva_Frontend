"use client";

import React, { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { SectionCard } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/query/keys";
import {
  getFarmAssessment, saveFarmAssessment, submitFarmAssessment,
  decideFarmAssessment, downloadFarmAssessment, type FarmAssessment,
} from "@/lib/api/farm-assessments";

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Awaiting asset owner review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

export function FarmAssessmentSection({
  planId,
  onContinue,
}: {
  planId: string;
  onContinue?: () => void;
}) {
  const { activeProgram, user } = useCropfortAuth();
  const queryClient = useQueryClient();
  const [reloadKey, setReloadKey] = useState(0);
  const queryKey = ["farm-assessment", activeProgram?.id, user.id, planId];
  const query = useQuery({
    queryKey,
    queryFn: () => getFarmAssessment(planId),
    enabled: Boolean(activeProgram?.id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <section id="farm-assessment" aria-label="Farm Assessment" className="scroll-mt-24">
      <SectionCard title="Farm Assessment">
        {query.isPending ? (
          <p className="text-sm text-muted-foreground" role="status">Loading assessment…</p>
        ) : query.isError ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">{query.error.message}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button>
          </div>
        ) : (
          <AssessmentForm
            key={`${activeProgram?.id}-${user.id}-${planId}-${query.data.revision}-${reloadKey}`}
            assessment={query.data}
            onUpdated={(assessment) => {
              queryClient.setQueryData(queryKey, assessment);
              void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
            }}
            onReload={() => void query.refetch().then((result) => {
              if (result.isSuccess) setReloadKey((key) => key + 1);
            })}
            onContinue={onContinue}
          />
        )}
      </SectionCard>
    </section>
  );
}

function AssessmentForm({ assessment, onUpdated, onReload, onContinue }: {
  assessment: FarmAssessment;
  onUpdated: (assessment: FarmAssessment) => void;
  onReload: () => void;
  onContinue?: () => void;
}) {
  const id = useId();
  const [findings, setFindings] = useState(assessment.findings);
  const [report, setReport] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const dirty = findings !== assessment.findings || report !== null;
  const mutation = useMutation({
    mutationFn: async (action: "save" | "submit" | "approve" | "request_changes") => {
      if (action === "save") return saveFarmAssessment(assessment.planId, findings, assessment.revision, report);
      if (action === "submit") return submitFarmAssessment(assessment.planId, assessment.revision);
      return decideFarmAssessment(assessment.planId, assessment.revision, action, comment);
    },
    onSuccess: (result, action) => {
      onUpdated(result);
      toast.success(action === "save" ? "Assessment saved" : action === "submit" ? "Assessment submitted to asset owners" : action === "approve" ? "Assessment approved" : "Changes requested");
    },
  });
  const download = useMutation({
    mutationFn: () => downloadFarmAssessment(assessment.planId, assessment.reportName!),
    onError: (error) => toast.error(error.message),
  });
  const pending = mutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Record the farm’s condition, findings, and recommendations for the asset owner.</p>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium" role="status">{STATUS_LABELS[assessment.status]}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${id}-findings`}>Findings</Label>
          {assessment.canEdit ? (
            <Textarea id={`${id}-findings`} rows={5} value={findings} maxLength={20000} disabled={pending}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Agronomic condition, infrastructure, labour, inputs, risks, and recommended actions…" />
          ) : (
            <p className="whitespace-pre-wrap break-words rounded-lg border p-3 text-sm">{assessment.findings || "No findings added yet."}</p>
          )}
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-report`}>Assessment report</Label>
            {assessment.reportName ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 break-words text-sm">{assessment.reportName}</span>
                <Button size="sm" variant="outline" onClick={() => download.mutate()} disabled={download.isPending}>
                  <Download className="size-4" aria-hidden /> {download.isPending ? "Downloading…" : "Download report"}
                </Button>
              </div>
            ) : <p className="text-sm text-muted-foreground">No report uploaded yet.</p>}
            {assessment.canEdit ? (
              <>
                <Input id={`${id}-report`} type="file" accept=".pdf,application/pdf" disabled={pending}
                  aria-describedby={`${id}-report-help`}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && (!/\.pdf$/i.test(file.name) || file.size > 5 * 1024 * 1024 || file.size === 0)) {
                      toast.error("Choose a PDF report up to 5 MB.");
                      e.target.value = "";
                      setReport(null);
                      return;
                    }
                    setReport(file);
                  }} />
                <p id={`${id}-report-help`} className="text-xs text-muted-foreground">PDF, up to 5 MB. Selecting a new file replaces the saved report when you save the draft.</p>
              </>
            ) : null}
          </div>
          {assessment.canEdit ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={pending || (!dirty && assessment.revision > 0)} onClick={() => mutation.mutate("save")}>
                  {pending && mutation.variables === "save" ? "Saving…" : "Save draft"}
                </Button>
                <Button disabled={pending || dirty || !assessment.findings.trim() || !assessment.reportName}
                  onClick={() => mutation.mutate("submit")}>
                  {pending && mutation.variables === "submit" ? "Submitting…" : "Submit to asset owner"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Save your findings and report before submitting. Asset owners will be notified to review them.</p>
            </div>
          ) : null}
        </div>
      </div>
      {assessment.canReview ? (
        <div className="space-y-3 rounded-lg border p-3">
          <Label htmlFor={`${id}-comment`}>Review comments</Label>
          <Textarea id={`${id}-comment`} rows={3} value={comment} maxLength={5000} disabled={pending}
            onChange={(e) => setComment(e.target.value)} placeholder="Add your review. Comments are required when requesting changes." />
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => mutation.mutate("approve")}>Approve assessment</Button>
            <Button variant="outline" disabled={pending || !comment.trim()} onClick={() => mutation.mutate("request_changes")}>Request changes</Button>
          </div>
        </div>
      ) : null}
      {mutation.isError ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{mutation.error.message}</p>
          <Button size="sm" variant="outline" disabled={pending} onClick={onReload}>Reload saved assessment</Button>
          <p className="text-xs text-muted-foreground">Reloading discards unsaved changes.</p>
        </div>
      ) : null}
      {assessment.history.length > 0 ? (
        <details className="rounded-lg border p-3" open={assessment.status === "changes_requested"}>
          <summary className="cursor-pointer text-sm font-medium">Review history</summary>
          <ol className="mt-3 space-y-3">
            {[...assessment.history].reverse().map((event, index) => (
              <li key={`${event.at}-${index}`} className="border-l-2 border-border pl-3 text-sm">
                <p className="font-medium">{event.actorName} · {event.action === "submitted" ? "Submitted" : STATUS_LABELS[event.action]}</p>
                <time dateTime={event.at} className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</time>
                {event.comment ? <p className="mt-1 whitespace-pre-wrap break-words">{event.comment}</p> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {onContinue ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button variant="outline" onClick={onContinue}>Continue to Core Operations scope</Button>
        </div>
      ) : null}
    </div>
  );
}
