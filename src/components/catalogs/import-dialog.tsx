"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  commitCatalogImport,
  previewCatalogImport,
  type CatalogImportPreview,
  type CatalogImportPreviewRow,
  type CatalogResourceType,
} from "@/lib/api/catalog-import-export";
import { downloadCatalogTemplate } from "@/lib/utils/catalog-template";

function rowBadge(row: CatalogImportPreviewRow) {
  if (row.status === "new") return <StatusBadge status="active" label="New" />;
  if (row.status === "update") return <StatusBadge status="submitted" label="Update" />;
  return <StatusBadge status="rejected" label={`Error: ${row.reason || "invalid"}`} />;
}

export function CatalogImportDialog({
  open,
  onOpenChange,
  resource,
  title,
  showStock,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: CatalogResourceType;
  title: string;
  showStock?: boolean;
  onImported?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CatalogImportPreview | null>(null);
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
      const data = await previewCatalogImport(resource, file);
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

  const allRows: CatalogImportPreviewRow[] = preview
    ? [...preview.validRows, ...preview.errorRows].sort((a, b) => a.rowNumber - b.rowNumber)
    : [];

  const validCount = preview?.validRows.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import {title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => downloadCatalogTemplate(resource)}
            >
              <Download className="h-4 w-4" aria-hidden />
              Download template
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {fileName ? "Replace file" : "Choose file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                {preview.summary.valid} valid ({preview.summary.toCreate} new,{" "}
                {preview.summary.toUpdate} update) · {preview.summary.errors} errors
              </p>
              <div className="max-h-72 overflow-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Unit</TableHead>
                      {showStock ? <TableHead className="text-right">Stock</TableHead> : null}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showStock ? 5 : 4} className="text-muted-foreground">
                          No data rows found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allRows.map((row) => (
                        <TableRow key={`${row.rowNumber}-${row.name}`}>
                          <TableCell className="cf-numeric text-muted-foreground">
                            {row.rowNumber}
                          </TableCell>
                          <TableCell className="font-medium">{row.name || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.defaultUnit || "—"}
                          </TableCell>
                          {showStock ? (
                            <TableCell className="cf-numeric text-right">
                              {row.stockQuantity != null ? row.stockQuantity : "—"}
                            </TableCell>
                          ) : null}
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
            disabled={busy || validCount === 0}
            onClick={async () => {
              if (!preview?.validRows.length) return;
              setBusy(true);
              try {
                const result = await commitCatalogImport(resource, preview.validRows);
                toast.success(
                  `Imported ${result.total} rows (${result.created} new, ${result.updated} updated)`,
                );
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
