"use client";

import { AreaWorkspaceById } from "@/components/cropfort/area-workspace";
import type { CropfortAreaId } from "@/config/cropfort-areas";

/** Thin client page for Cropfort area shells. */
export function CropfortAreaPage({ areaId }: { areaId: CropfortAreaId }) {
  return <AreaWorkspaceById id={areaId} />;
}
