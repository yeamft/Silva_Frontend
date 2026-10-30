"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileText, Image as ImageIcon, Loader2, Paperclip, Sheet, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PLAN_FILE_ACCEPT,
  PLAN_FILE_MAX_MB,
  deletePlanFile,
  downloadPlanFile,
  listPlanFiles,
  uploadPlanFile,
  type PlanFileDto,
} from "@/lib/api/plan-files";
import { cn } from "@/lib/utils";

export const planFilesKey = (planId: string) => ["programme-plans", "files", planId] as const;

export const fmtSize = (bytes: number) =>
  bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function fileIcon(name: string) {
  if (/\.(png|jpe?g|gif|webp|heic)$/i.test(name)) return ImageIcon;
  if (/\.(xlsx?|csv)$/i.test(name)) return Sheet;
  return FileText;
}

/** Files attached to a plan, with download — and upload / remove while the plan can be edited. */
export function PlanFilesCard({ planId, canEdit }: { planId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const query = useQuery({ queryKey: planFilesKey(planId), queryFn: () => listPlanFiles(planId) });
  const files = query.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => deletePlanFile(planId, id),
    // Gone from the list at once; back if the server refuses
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: planFilesKey(planId) });
      const previous = qc.getQueryData<PlanFileDto[]>(planFilesKey(planId));
      qc.setQueryData<PlanFileDto[]>(planFilesKey(planId), (old) => (old ?? []).filter((f) => f.id !== id));
      return { previous };
    },
    onError: (err, _id, ctx) => {
      qc.setQueryData(planFilesKey(planId), ctx?.previous);
      toast.error(err instanceof Error ? err.message : "Could not remove the file");
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: planFilesKey(planId) }),
  });

  const upload = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    const tooBig = picked.filter((f) => f.size > PLAN_FILE_MAX_MB * 1024 * 1024);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(", ")}: larger than ${PLAN_FILE_MAX_MB} MB`);
    const ok = picked.filter((f) => f.size <= PLAN_FILE_MAX_MB * 1024 * 1024);
    if (!ok.length) return;
    setUploading((u) => [...u, ...ok.map((f) => f.name)]);
    const results = await Promise.allSettled(ok.map((f) => uploadPlanFile(planId, f)));
    setUploading((u) => u.filter((n) => !ok.some((f) => f.name === n)));
    const added = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (added.length) {
      qc.setQueryData<PlanFileDto[]>(planFilesKey(planId), (old) => [...(old ?? []), ...added]);
      toast.success(`Attached ${added.length} file${added.length === 1 ? "" : "s"}`);
    }
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        toast.error(`${ok[i].name}: ${r.reason instanceof Error ? r.reason.message : "upload failed"}`);
      }
    });
  };

  const download = async (f: PlanFileDto) => {
    setDownloading(f.id);
    try {
      await downloadPlanFile(planId, f);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the file");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card text-foreground/70" aria-hidden>
          <Paperclip className="h-4 w-4" />
        </span>
        <h3 className="flex-1 text-sm font-semibold">
          Attachments
          {files.length ? <span className="ml-1.5 font-normal text-muted-foreground">· {files.length}</span> : null}
        </h3>
        {canEdit ? (
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Add files
          </Button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={PLAN_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {canEdit ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
            dragging ? "border-primary bg-primary/[0.06]" : "border-border hover:border-primary/40 hover:bg-muted/30",
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Drop files here or click to choose</p>
          <p className="text-xs text-muted-foreground">PDF, Word, Excel, images, maps · up to {PLAN_FILE_MAX_MB} MB each</p>
        </div>
      ) : null}

      <ul className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {uploading.map((name) => (
            <motion.li
              key={`up-${name}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="text-xs text-muted-foreground">Uploading…</span>
            </motion.li>
          ))}
          {files.map((f) => {
            const Icon = fileIcon(f.fileName);
            return (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.fileName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[fmtSize(f.sizeBytes), f.uploadedByName].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={downloading === f.id}
                  aria-label={`Download ${f.fileName}`}
                  onClick={() => void download(f)}
                >
                  {downloading === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
                {canEdit ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${f.fileName}`}
                    onClick={() => remove.mutate(f.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {!canEdit && !files.length && !query.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">No files attached.</p>
      ) : null}
    </section>
  );
}
