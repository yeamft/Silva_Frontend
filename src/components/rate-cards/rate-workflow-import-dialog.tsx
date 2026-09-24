"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  commitRateImport,
  downloadRateImportTemplate,
  previewRateImport,
  type RateImportKind,
  type RateImportPreview,
  type RateImportPreviewRow,
} from "@/lib/mock-api/rate-workflow-import";
import type { WorkflowContextFilters } from "@/types/rate-card-workflow";

const KIND_LABELS: Record<RateImportKind, string> = {
  benchmark_survey: "Benchmark survey",
  labor_rate_card: "Labor rate card",
  material_rate_card: "Material rate card",
  service_rate_card: "Outsourced services rate card",
};

function rowBadge(row: RateImportPreviewRow) {
  if (row.status === "new") return <StatusBadge status="active" label="New" />;
  return <StatusBadge status="rejected" label={`Error: ${row.reason || "invalid"}`} />;
}

export function RateWorkflowImportDialog({
  open,
  onOpenChange,
  kinds,
  defaultKind,
  ctx,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Allowed import kinds for this surface. */
  kinds: RateImportKind[];
  defaultKind?: RateImportKind;
  ctx: WorkflowContextFilters;
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<RateImportKind>(defaultKind ?? kinds[0]);
  const [preview, setPreview] = useState<RateImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const reset = () => {
    setPreview(null);
    setFileName(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runPreview = async (file: File) => {
    setBusy(true);
    setFileName(file.name);
    try {
      const data = await previewRateImport(kind, file, {
        ...ctx,
        farmAreaId: ctx.farmAreaId === "all" ? "" : ctx.farmAreaId,
      });
      setPreview(data);
      if (data.summary.valid === 0 && data.summary.errors > 0) {
        toast.error("No valid rows — fix errors and re-upload");
      }
    } catch (err) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const allRows: RateImportPreviewRow[] = preview
    ? [...preview.validRows, ...preview.errorRows].sort((a, b) => a.rowNumber - b.rowNumber)
    : [];

  const validCount = preview?.validRows.length ?? 0;
  const farmOk = ctx.farmAreaId !== "all" && Boolean(ctx.farmAreaId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import {KIND_LABELS[kind]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {!farmOk ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Select a specific farm area in the period bar before importing.
            </p>
          ) : null}

          {kinds.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Template</span>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as RateImportKind);
                  setPreview(null);
                  setFileName(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <SelectTrigger className="h-9 w-[220px]" aria-label="Import template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kinds.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => downloadRateImportTemplate(kind)}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download template
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || !farmOk}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {fileName ? "Replace file" : "Choose file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runPreview(file);
              }}
            />
            {fileName ? <span className="text-xs text-muted-foreground">{fileName}</span> : null}
          </div>

          {preview ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {preview.summary.valid} valid · {preview.summary.errors} errors — drafts only; AO
                approval happens on submitted rate cards.
              </p>
              <div className="max-h-72 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Row</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          No data rows found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRows.map((row) => (
                        <TableRow key={`${row.rowNumber}-${row.label}`}>
                          <TableCell className="cf-numeric text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="font-medium">{row.label || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.detail || row.reason || "—"}
                          </TableCell>
                          <TableCell>{rowBadge(row)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || validCount === 0 || !farmOk}
            onClick={async () => {
              if (!preview?.validRows.length) return;
              setBusy(true);
              try {
                const result = await commitRateImport(
                  kind,
                  {
                    ...ctx,
                    farmAreaId: ctx.farmAreaId === "all" ? "" : ctx.farmAreaId,
                  },
                  preview.validRows,
                );
                toast.success(`Created ${result.created} draft${result.created === 1 ? "" : "s"}`);
                handleClose(false);
                onImported?.();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Import failed — no changes saved");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : `Import ${validCount} row${validCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
