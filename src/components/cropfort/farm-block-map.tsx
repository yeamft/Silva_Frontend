"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FarmArea, FarmBlockRef } from "@/types/cropfort-modules";
import { cn } from "@/lib/utils";

/** Approximate Jimma / SW Ethiopia coffee belt — used until real GPS is stored. */
const ESTATE_ORIGIN = { lat: 7.673, lng: 36.834 };

const AREA_PALETTE = [
  "#2F6B3A",
  "#B8860B",
  "#1F4E79",
  "#8B4513",
  "#556B2F",
  "#A0522D",
  "#2E8B57",
  "#6B4423",
];

function hashString(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function areaCenter(areaId: string, index: number) {
  const h = hashString(areaId);
  const ring = Math.floor(index / 4);
  const slot = index % 4;
  const angle = (slot / 4) * Math.PI * 2 + (h % 40) * 0.01;
  const radiusDeg = 0.035 + ring * 0.028 + (h % 17) * 0.001;
  return {
    lat: ESTATE_ORIGIN.lat + Math.sin(angle) * radiusDeg,
    lng: ESTATE_ORIGIN.lng + Math.cos(angle) * radiusDeg,
  };
}

/** Rough ha → degrees half-width (local, not geodesic-perfect). */
function halfSpanFromHa(hectares: number) {
  const sideM = Math.sqrt(Math.max(hectares, 0.25) * 10_000);
  return Math.max(0.0009, Math.min(0.0065, sideM / 111_320));
}

export type MapSelection =
  | { kind: "area"; id: string }
  | { kind: "block"; id: string; farmAreaId: string | null };

type PlacedBlock = {
  block: FarmBlockRef;
  farmAreaId: string;
  bounds: L.LatLngBoundsExpression;
  color: string;
};

function layoutBlocks(
  farmAreas: FarmArea[],
  blocks: FarmBlockRef[],
): { placements: PlacedBlock[]; centers: { id: string; name: string; lat: number; lng: number; color: string }[] } {
  const byArea = new Map<string, FarmBlockRef[]>();
  for (const area of farmAreas) {
    byArea.set(area.id, []);
  }
  for (const block of blocks) {
    const areaId = block.farmAreaId;
    if (!areaId || !byArea.has(areaId)) continue;
    byArea.get(areaId)!.push(block);
  }

  const placements: PlacedBlock[] = [];
  const centers: { id: string; name: string; lat: number; lng: number; color: string }[] = [];

  farmAreas.forEach((area, areaIndex) => {
    const color = AREA_PALETTE[areaIndex % AREA_PALETTE.length];
    const center = areaCenter(area.id, areaIndex);
    centers.push({ id: area.id, name: area.name, lat: center.lat, lng: center.lng, color });

    const areaBlocks = byArea.get(area.id) ?? [];
    const gpsBlocks = areaBlocks.filter(
      (b) =>
        b.mapLat != null &&
        b.mapLng != null &&
        Number.isFinite(b.mapLat) &&
        Number.isFinite(b.mapLng),
    );
    if (gpsBlocks.length > 0) {
      const avgLat = gpsBlocks.reduce((s, b) => s + Number(b.mapLat), 0) / gpsBlocks.length;
      const avgLng = gpsBlocks.reduce((s, b) => s + Number(b.mapLng), 0) / gpsBlocks.length;
      centers[centers.length - 1] = {
        id: area.id,
        name: area.name,
        lat: avgLat,
        lng: avgLng,
        color,
      };
    }

    const cols = Math.max(1, Math.ceil(Math.sqrt(areaBlocks.length || 1)));
    areaBlocks.forEach((block, i) => {
      const half = halfSpanFromHa(block.hectares || 1);
      const hasGps =
        block.mapLat != null &&
        block.mapLng != null &&
        Number.isFinite(block.mapLat) &&
        Number.isFinite(block.mapLng);
      let lat: number;
      let lng: number;
      if (hasGps) {
        lat = Number(block.mapLat);
        lng = Number(block.mapLng);
      } else {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const gap = half * 2.35;
        const origin = centers[centers.length - 1];
        lat = origin.lat + (row - (cols - 1) / 2) * gap;
        lng = origin.lng + (col - (cols - 1) / 2) * gap;
      }
      placements.push({
        block,
        farmAreaId: area.id,
        color,
        bounds: [
          [lat - half, lng - half],
          [lat + half, lng + half],
        ],
      });
    });
  });

  return { placements, centers };
}

type Props = {
  farmAreas: FarmArea[];
  blocks: FarmBlockRef[];
  selectedAreaId?: string | null;
  selectedBlockId?: string | null;
  onSelect: (selection: MapSelection | null) => void;
  className?: string;
  readOnly?: boolean;
};

export function FarmBlockMap({
  farmAreas,
  blocks,
  selectedAreaId,
  selectedBlockId,
  onSelect,
  className,
  readOnly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const layout = useMemo(() => layoutBlocks(farmAreas, blocks), [farmAreas, blocks]);
  const hasRealGps = useMemo(
    () =>
      blocks.some(
        (b) =>
          b.mapLat != null &&
          b.mapLng != null &&
          Number.isFinite(b.mapLat) &&
          Number.isFinite(b.mapLng),
      ),
    [blocks],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    }).setView([ESTATE_ORIGIN.lat, ESTATE_ORIGIN.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layers;

    map.on("click", () => onSelectRef.current(null));

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    const fitTargets: L.LatLngBoundsExpression[] = [];

    for (const center of layout.centers) {
      const marker = L.circleMarker([center.lat, center.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: center.color,
        fillOpacity: 0.95,
      });
      marker.bindTooltip(center.name, { direction: "top", offset: [0, -6] });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current({ kind: "area", id: center.id });
      });
      layers.addLayer(marker);
    }

    for (const placed of layout.placements) {
      const selected =
        selectedBlockId === placed.block.id ||
        (!selectedBlockId && selectedAreaId === placed.farmAreaId);
      const rect = L.rectangle(placed.bounds, {
        color: selected ? "#111827" : placed.color,
        weight: selected ? 3 : 1.5,
        fillColor: placed.color,
        fillOpacity: selected ? 0.55 : 0.32,
        className: "cursor-pointer",
      });
      rect.bindTooltip(
        `${placed.block.code} · ${placed.block.name} · ${placed.block.hectares} ha`,
        { sticky: true },
      );
      rect.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current({
          kind: "block",
          id: placed.block.id,
          farmAreaId: placed.farmAreaId,
        });
      });
      layers.addLayer(rect);
      fitTargets.push(placed.bounds);
    }
  }, [layout, selectedAreaId, selectedBlockId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layout.placements.length > 0) {
      const first = layout.placements[0].bounds as L.LatLngBoundsLiteral;
      const bounds = L.latLngBounds(first);
      for (let i = 1; i < layout.placements.length; i += 1) {
        bounds.extend(L.latLngBounds(layout.placements[i].bounds as L.LatLngBoundsLiteral));
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.28), { animate: false });
      }
    } else if (layout.centers.length > 0) {
      map.setView([layout.centers[0].lat, layout.centers[0].lng], 13, { animate: false });
    }
  }, [layout]);

  return (
    <div
      className={cn(
        /* Isolate Leaflet panes/controls (z~400–1000) so Sheet/Dialog (z-50) stay on top */
        "relative z-0 isolate overflow-hidden rounded-xl border border-border bg-muted/30",
        className,
      )}
    >
      <div ref={containerRef} className="relative z-0 h-[min(62vh,560px)] w-full" />
      <p className="pointer-events-none absolute bottom-3 left-3 z-[1] rounded-md bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        {hasRealGps
          ? readOnly
            ? "Estate view · GPS where captured"
            : "GPS blocks plotted · others approximate"
          : "Approximate layout — set mapLat/mapLng on blocks for real GPS"}
      </p>
    </div>
  );
}
