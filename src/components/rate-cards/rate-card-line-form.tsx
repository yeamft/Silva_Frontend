"use client";

import { FormField } from "@/components/cropfort/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPct } from "@/lib/formatBirr";
import { VARIANCE_FLAG_THRESHOLD_PCT } from "@/lib/mock-api/variance";
import type { RateCardCategoryConfig } from "@/types/cropfort-modules";
import { formatBudgetYearLabel } from "@/types/cropfort-modules";

export type RateCardLineFormState = {
  resourceCode: string;
  resourceName: string;
  category: string;
  unitOfMeasure: string;
  rateBirr: string;
  benchmarkFarmARate: string;
  benchmarkFarmBRate: string;
  justificationNote: string;
  budgetYear: string;
  effectiveFrom: string;
  effectiveTo: string;
};

export function RateCardLineFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  formErrors,
  saving,
  onSave,
  budgetYearOptions,
  activeCategories,
  categoryLabelFor,
  onManageCategories,
  canManageCategories,
  previewVariancePct,
  previewFlagged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: RateCardLineFormState;
  setForm: (next: RateCardLineFormState) => void;
  formErrors: Record<string, string>;
  saving: boolean;
  onSave: () => void;
  budgetYearOptions: number[];
  activeCategories: RateCardCategoryConfig[];
  categoryLabelFor: (value: string) => string;
  onManageCategories?: () => void;
  canManageCategories?: boolean;
  previewVariancePct: number | null;
  previewFlagged: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit line" : "New rate line"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Resource code"
            required
            error={formErrors.resourceCode}
            render={(props) => (
              <Input
                {...props}
                value={form.resourceCode}
                onChange={(e) => setForm({ ...form, resourceCode: e.target.value })}
              />
            )}
          />
          <FormField
            label="Resource name"
            required
            error={formErrors.resourceName}
            render={(props) => (
              <Input
                {...props}
                value={form.resourceName}
                onChange={(e) => setForm({ ...form, resourceName: e.target.value })}
              />
            )}
          />
          <FormField
            label="Budget year"
            required
            error={formErrors.budgetYear}
            render={({ id }) => (
              <Select
                value={form.budgetYear || undefined}
                onValueChange={(v) => setForm({ ...form, budgetYear: v })}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder="Select FY" />
                </SelectTrigger>
                <SelectContent>
                  {budgetYearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {formatBudgetYearLabel(y)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Category"
            required
            error={formErrors.category}
            render={({ id }) => (
              <div className="space-y-2">
                <Select
                  value={form.category || undefined}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                    {editing &&
                    form.category &&
                    !activeCategories.some((c) => c.value === form.category) ? (
                      <SelectItem value={form.category}>
                        {categoryLabelFor(form.category)} (inactive)
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                {canManageCategories && onManageCategories ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs"
                    onClick={onManageCategories}
                  >
                    Manage categories
                  </Button>
                ) : null}
              </div>
            )}
          />
          <FormField
            label="Unit of measure"
            required
            error={formErrors.unitOfMeasure}
            render={(props) => (
              <Input
                {...props}
                value={form.unitOfMeasure}
                onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
              />
            )}
          />
          <FormField
            label="Rate (Birr)"
            required
            error={formErrors.rateBirr}
            render={(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={form.rateBirr}
                onChange={(e) => setForm({ ...form, rateBirr: e.target.value })}
              />
            )}
          />
          <FormField
            label="Benchmark farm A (Birr)"
            optional
            error={formErrors.benchmarkFarmARate}
            render={(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={form.benchmarkFarmARate}
                onChange={(e) => setForm({ ...form, benchmarkFarmARate: e.target.value })}
              />
            )}
          />
          <FormField
            label="Benchmark farm B (Birr)"
            optional
            error={formErrors.benchmarkFarmBRate}
            render={(props) => (
              <Input
                {...props}
                inputMode="decimal"
                value={form.benchmarkFarmBRate}
                onChange={(e) => setForm({ ...form, benchmarkFarmBRate: e.target.value })}
              />
            )}
          />
          <FormField
            label="Effective from"
            optional
            render={(props) => (
              <Input
                {...props}
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
              />
            )}
          />
          <FormField
            label="Effective to"
            optional
            render={(props) => (
              <Input
                {...props}
                type="date"
                value={form.effectiveTo}
                onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
              />
            )}
          />
          {previewVariancePct != null ? (
            <div className="sm:col-span-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
              <span className="font-medium">{formatPct(previewVariancePct)}</span>
              <span className="text-muted-foreground">
                {" "}
                vs benchmark
                {previewFlagged ? ` · flagged over ±${VARIANCE_FLAG_THRESHOLD_PCT}%` : ""}
              </span>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <FormField
              label="Justification"
              required={previewFlagged}
              error={formErrors.justificationNote}
              render={(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  value={form.justificationNote}
                  onChange={(e) => setForm({ ...form, justificationNote: e.target.value })}
                />
              )}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save line"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
