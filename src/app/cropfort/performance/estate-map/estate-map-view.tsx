"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useBlocks, useFarmAreas } from "@/lib/query";
import type { MapSelection } from "@/components/cropfort/farm-block-map";

const FarmBlockMap = dynamic(
  () => import("@/components/cropfort/farm-block-map").then((m) => m.FarmBlockMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(62vh,560px)] items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Loading estate map…
      </div>
    ),
  },
);

/** Read-only estate map for Silva / asset owners (and SPX). */
export default function EstateMapView() {
  const { activeProgram } = useCropfortAuth();
  const areasQuery = useFarmAreas(Boolean(activeProgram?.id));
  const blocksQuery = useBlocks(Boolean(activeProgram?.id));
  const farmAreas = areasQuery.data ?? [];
  const blocks = blocksQuery.data ?? [];
  const loading = areasQuery.isLoading || blocksQuery.isLoading;

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedArea = useMemo(
    () => farmAreas.find((a) => a.id === selectedAreaId) ?? null,
    [farmAreas, selectedAreaId],
  );
  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const onSelect = (selection: MapSelection | null) => {
    if (!selection) {
      setSelectedAreaId(null);
      setSelectedBlockId(null);
      return;
    }
    if (selection.kind === "area") {
      setSelectedAreaId(selection.id);
      setSelectedBlockId(null);
      return;
    }
    setSelectedBlockId(selection.id);
    setSelectedAreaId(selection.farmAreaId);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Performance"}
        title="Estate map"
        description="Farm areas and blocks on your estate (read-only)."
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Performance", href: CROPFORT_ROUTES.progress },
          { label: "Estate map" },
        ]}
      />

      <SectionCard title="Map" description="Select a block to see hectares and status">
        {loading ? (
          <div className="flex h-[min(62vh,560px)] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : farmAreas.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPinned className="h-8 w-8 opacity-50" />
            No farm areas on this programme yet.
          </div>
        ) : (
          <FarmBlockMap
            farmAreas={farmAreas}
            blocks={blocks}
            selectedAreaId={selectedAreaId}
            selectedBlockId={selectedBlockId}
            onSelect={onSelect}
            readOnly
          />
        )}
      </SectionCard>

      {selectedArea ? (
        <SectionCard title={selectedArea.name}>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusBadge status={selectedArea.status} />
            <span className="tabular-nums text-muted-foreground">
              {selectedArea.totalHectares.toLocaleString()} ha · {selectedArea.blockIds.length}{" "}
              blocks
            </span>
            {selectedBlock ? (
              <span className="font-medium">
                {selectedBlock.code} · {selectedBlock.name} · {selectedBlock.hectares} ha
              </span>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
