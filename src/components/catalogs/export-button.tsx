"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportCatalog, type CatalogResourceType } from "@/lib/api/catalog-import-export";

export function CatalogExportButton({
  resource,
  search,
  isActive,
}: {
  resource: CatalogResourceType;
  /** Current list search filter */
  search?: string;
  /** When set, export only active or inactive rows */
  isActive?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await exportCatalog(resource, {
            q: search?.trim() || undefined,
            isActive,
          });
          toast.success("Export downloaded");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download className="h-4 w-4" aria-hidden />
      {busy ? "Exporting…" : "Export"}
    </Button>
  );
}
