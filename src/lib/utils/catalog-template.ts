import type { CatalogResourceType } from "@/lib/api/catalog-import-export";

const HEADERS: Record<CatalogResourceType, string[]> = {
  labor: ["name", "description", "default_unit"],
  equipment: ["name", "description", "default_unit"],
  materials: ["name", "description", "default_unit", "stock_quantity"],
};

const FILENAMES: Record<CatalogResourceType, string> = {
  labor: "labor-activities-template.csv",
  equipment: "equipment-resources-template.csv",
  materials: "materials-template.csv",
};

/** Download a blank CSV template (headers only) for the given catalog. */
export function downloadCatalogTemplate(resource: CatalogResourceType) {
  const headers = HEADERS[resource];
  const csv = `${headers.join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILENAMES[resource];
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function catalogTemplateHeaders(resource: CatalogResourceType): string[] {
  return HEADERS[resource];
}
