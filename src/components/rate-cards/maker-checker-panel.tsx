"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { FormField } from "@/components/cropfort/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { EligibleChecker, WorkflowStatus } from "@/types/rate-card-workflow";

/**
 * Maker–Checker for Rate Cards.
 * Maker = SPX (propose/submit). Checker = Asset Owner (approve/reject).
 */
export function MakerCheckerPanel({
  status,
  canSubmit,
  canDecide,
  busy,
  checker,
  entityLabel,
  onSubmit,
  onApprove,
  onReturn,
}: {
  status: WorkflowStatus;
  canSubmit: boolean;
  canDecide: boolean;
  busy: boolean;
  checker?: EligibleChecker | null;
  entityLabel: string;
  onSubmit: () => Promise<void>;
  onApprove: () => Promise<void>;
  onReturn: (comment: string) => Promise<void>;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const showSubmit = canSubmit && (status === "draft" || status === "returned");
  const showDecide = canDecide && status === "submitted";

  if (!showSubmit && !showDecide && !checker) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      {checker ? (
        <p className="mr-auto text-xs text-muted-foreground">
          Reviewer:{" "}
          <span className="font-medium text-foreground">{checker.name}</span>
          <span>
            {" "}
            · {checker.orgName} · {checker.assignmentLabel}
          </span>
        </p>
      ) : null}

      {showSubmit ? (
        <Button size="sm" disabled={busy} onClick={() => void onSubmit()}>
          Submit
        </Button>
      ) : null}

      {showDecide ? (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
          <Button size="sm" disabled={busy} onClick={() => setApproveOpen(true)}>
            Approve
          </Button>
        </>
      ) : null}

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve rate card?"
        description={`Approve ${entityLabel}. This unlocks rate resolution.`}
        confirmLabel="Approve"
        destructive={false}
        loading={busy}
        onConfirm={async () => {
          await onApprove();
          setApproveOpen(false);
        }}
      />

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectComment("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject rate card</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{entityLabel}</p>
          <FormField
            label="Reject comment"
            required
            render={(props) => (
              <Textarea
                {...props}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                placeholder="Reason for rejection — SPX will revise and resubmit"
              />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectComment.trim() || busy}
              onClick={async () => {
                await onReturn(rejectComment.trim());
                setRejectComment("");
                setRejectOpen(false);
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
