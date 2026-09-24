"use client";

import { FormField } from "@/components/cropfort/form-field";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type RateCardFormValues = {
  proposedRate: string;
  availableFrom: string;
  availableTo: string;
  fallbackRate: string;
  norm: string;
  sourceBasis: string;
  sourceEvidence: string;
  justificationNote: string;
  notes: string;
};

/** Standing-shaped rate card fields (Code/Activity/Scope/UoM shown by parent). */
export function DirectRateCardForm({
  values,
  onChange,
  flagged,
  uom,
  disabled,
}: {
  values: RateCardFormValues;
  onChange: (next: RateCardFormValues) => void;
  flagged?: boolean;
  uom?: string | null;
  disabled?: boolean;
}) {
  const set = <K extends keyof RateCardFormValues>(key: K, value: RateCardFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField
        label={`Approved / proposed (ETB${uom ? ` / ${uom}` : ""})`}
        required
        render={(props) => (
          <Input
            {...props}
            type="number"
            value={values.proposedRate}
            disabled={disabled}
            onChange={(e) => set("proposedRate", e.target.value)}
          />
        )}
      />
      <FormField
        label="Fallback (ETB)"
        render={(props) => (
          <Input
            {...props}
            type="number"
            value={values.fallbackRate}
            disabled={disabled}
            onChange={(e) => set("fallbackRate", e.target.value)}
          />
        )}
      />
      <FormField
        label="Norm"
        render={(props) => (
          <Input
            {...props}
            type="number"
            value={values.norm}
            disabled={disabled}
            onChange={(e) => set("norm", e.target.value)}
          />
        )}
      />
      <FormField
        label="Source / basis"
        render={(props) => (
          <Input
            {...props}
            value={values.sourceBasis}
            disabled={disabled}
            onChange={(e) => set("sourceBasis", e.target.value)}
          />
        )}
      />
      <FormField
        label="Effective from"
        required
        render={(props) => (
          <Input
            {...props}
            type="date"
            value={values.availableFrom}
            disabled={disabled}
            onChange={(e) => set("availableFrom", e.target.value)}
          />
        )}
      />
      <FormField
        label="Effective to"
        render={(props) => (
          <Input
            {...props}
            type="date"
            value={values.availableTo}
            disabled={disabled}
            onChange={(e) => set("availableTo", e.target.value)}
          />
        )}
      />
      <div className="sm:col-span-2">
        <FormField
          label="Source / evidence"
          render={(props) => (
            <Input
              {...props}
              value={values.sourceEvidence}
              disabled={disabled}
              onChange={(e) => set("sourceEvidence", e.target.value)}
            />
          )}
        />
      </div>
      {flagged ? (
        <div className="sm:col-span-2">
          <FormField
            label="Variance justification"
            required
            render={(props) => (
              <Textarea
                {...props}
                value={values.justificationNote}
                disabled={disabled}
                onChange={(e) => set("justificationNote", e.target.value)}
                rows={3}
              />
            )}
          />
          <StatusBadge status="flagged" label="Flagged ±10%" className="mt-2" />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <FormField
          label="Notes"
          render={(props) => (
            <Textarea
              {...props}
              value={values.notes}
              disabled={disabled}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          )}
        />
      </div>
    </div>
  );
}
