"use client";

import { useCallback, useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { canManageRateCardCategories, canViewRateCard } from "@/lib/cropfortAccess";
import {
  createRateCardCategory,
  deleteRateCardCategory,
  getRateCardCategories,
  updateRateCardCategory,
} from "@/lib/api/rate-card";
import type { RateCardCategoryConfig } from "@/types/cropfort-modules";

export default function RateCardCategoriesPage() {
  const { user } = useCropfortAuth();
  const canView = canViewRateCard(user.role);
  const canEdit = canManageRateCardCategories(user.role);

  const [categories, setCategories] = useState<RateCardCategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<RateCardCategoryConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RateCardCategoryConfig | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getRateCardCategories());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canEdit) void reload();
  }, [canEdit, reload]);

  if (!canView || !canEdit) {
    return <NotAuthorized title="Rate categories" />;
  }

  async function save() {
    if (!canEdit) return;
    if (!label.trim()) {
      toast.error("Enter a category name");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateRateCardCategory(editing.id, {
          label: label.trim(),
          active: editing.active,
        });
        toast.success("Category updated");
      } else {
        await createRateCardCategory({ label: label.trim() });
        toast.success("Category added");
      }
      setEditing(null);
      setLabel("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Categories" />

      <SectionCard title="Category list">
        {canEdit ? (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField
              className="flex-1"
              label={editing ? "Rename category" : "New category"}
              required
              render={(props) => (
                <Input
                  {...props}
                  id="category-label"
                  placeholder="e.g. Labour, Material, Machinery"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void save();
                    }
                  }}
                />
              )}
            />
            <div className="flex gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setLabel("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              ) : null}
              <Button type="button" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Tags className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No categories yet. Add Labour or Material to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {categories
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{cat.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{cat.value}</p>
                  </div>
                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cat.active}
                        aria-label={`${cat.active ? "Deactivate" : "Activate"} ${cat.label}`}
                        onCheckedChange={async (checked) => {
                          try {
                            await updateRateCardCategory(cat.id, {
                              label: cat.label,
                              active: checked,
                            });
                            await reload();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Update failed");
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(cat);
                          setLabel(cat.label);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {cat.active ? "Active" : "Inactive"}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete category?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.label}”? Rates using it may need reassignment.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteRateCardCategory(deleteTarget.id);
            toast.success("Category deleted");
            setDeleteTarget(null);
            await reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
          }
        }}
      />
    </PageContainer>
  );
}
