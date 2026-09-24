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
import type { RateCardLine } from "@/types/cropfort-modules";

/**
 * Approve / return panel for submitted rate lines (decision-maker flow).
 */
export function RateCardApprovalPanel({
  approveTarget,
  returnTarget,
  busy,
  onApproveOpenChange,
  onReturnOpenChange,
  onApprove,
  onReturn,
}: {
  approveTarget: RateCardLine | null;
  returnTarget: RateCardLine | null;
  busy: boolean;
  onApproveOpenChange: (open: boolean) => void;
  onReturnOpenChange: (open: boolean) => void;
  onApprove: (line: RateCardLine) => Promise<void>;
  onReturn: (line: RateCardLine, comment: string) => Promise<void>;
}) {
  const [returnComment, setReturnComment] = useState("");

  return (
    <>
      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) onApproveOpenChange(false);
        }}
        title="Approve this rate?"
        description={
          approveTarget
            ? `Approve ${approveTarget.resourceCode} · ${approveTarget.resourceName} for use in this budget year.`
            : undefined
        }
        confirmLabel="Approve"
        destructive={false}
        loading={busy}
        onConfirm={async () => {
          if (!approveTarget) return;
          await onApprove(approveTarget);
        }}
      />

      <Dialog
        open={Boolean(returnTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReturnComment("");
            onReturnOpenChange(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return line</DialogTitle>
          </DialogHeader>
          {returnTarget ? (
            <p className="text-sm text-muted-foreground">
              {returnTarget.resourceCode} · {returnTarget.resourceName}
            </p>
          ) : null}
          <FormField
            label="Decision comment"
            required
            render={(props) => (
              <Textarea
                {...props}
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                rows={4}
              />
            )}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReturnComment("");
                onReturnOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!returnComment.trim() || busy || !returnTarget}
              onClick={async () => {
                if (!returnTarget) return;
                await onReturn(returnTarget, returnComment);
                setReturnComment("");
              }}
            >
              Return line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
