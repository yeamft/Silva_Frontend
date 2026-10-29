"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, FileText, Leaf, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import {
  downloadFarmAssessment,
  listFarmAssessments,
  type AssessmentPurpose,
  type AssessmentStatus,
} from "@/lib/api/farm-assessments";
import { cn } from "@/lib/utils";

const STATUS: Record<AssessmentStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  approved: { label: "Approved", tone: "bg-primary/10 text-primary" },
  changes_requested: { label: "Changes requested", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
};

const fmtDate = (d: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

const purposeLabel = (p: AssessmentPurpose) => String(p).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** The farm's assessments, with the ones linked to this plan (same cache as the plan editor's card). */
export function usePlanAssessments(planId: string, farmEstateId: string) {
  const { activeProgram } = useCropfortAuth();
  const query = useQuery({
    queryKey: ["farm-assessments", activeProgram?.id, "farm", farmEstateId],
    queryFn: () => listFarmAssessments({ farmEstateId }),
    enabled: Boolean(activeProgram?.id && farmEstateId),
  });
  return { query, linked: (query.data ?? []).filter((a) => a.planId === planId) };
}

/** Farm assessments linked to a plan and the files attached to them, for the approval page. */
export function PlanAttachments({ planId, farmEstateId }: { planId: string; farmEstateId: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { query, linked } = usePlanAssessments(planId, farmEstateId);
  const files = linked.filter((a) => a.reportName);

  const download = async (id: string, name: string) => {
    setDownloading(id);
    try {
      await downloadFarmAssessment(id, name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the file");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
        Attachments
        {linked.length ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {linked.length + files.length}
          </span>
        ) : null}
      </h3>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !linked.length ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No farm assessment or files attached.
        </p>
      ) : (
        <ul className="space-y-2">
          {linked.map((a) => {
            const date = fmtDate(a.assessmentDate);
            return (
              <li key={a.id} className="rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                    <Leaf className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        "Farm assessment",
                        purposeLabel(a.assessmentPurpose),
                        date,
                        a.assessedAreaHa ? `${a.assessedAreaHa.toLocaleString()} ha` : null,
                        `${a.findingsCount} finding${a.findingsCount === 1 ? "" : "s"}`,
                        `${a.recommendationsCount} recommendation${a.recommendationsCount === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS[a.status].tone)}>
                    {STATUS[a.status].label}
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`${CROPFORT_ROUTES.farmAssessments}/${a.id}`}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Open
                    </Link>
                  </Button>
                </div>
                {a.reportName ? (
                  <div className="flex items-center gap-3 border-t border-border bg-muted/20 px-4 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{a.reportName}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={downloading === a.id}
                      onClick={() => void download(a.id, a.reportName!)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      {downloading === a.id ? "Downloading…" : "Download"}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
