"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import {
  TableMessageRow,
  TablePagination,
  TableSkeleton,
  TableToolbar,
} from "@/components/cropfort/data-table";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useAssetOwners,
  useBlocks,
  useFarmAreas,
  useFarmMapOverview,
  useVendors,
} from "@/lib/query";
import { ORG_TYPE_LABELS } from "@/types/cropfort-modules";
import type { MapSelection } from "@/components/cropfort/farm-block-map";

const FarmBlockMap = dynamic(
  () => import("@/components/cropfort/farm-block-map").then((m) => m.FarmBlockMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(62vh,560px)] items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

const PAGE_SIZE = 10;

export default function FarmMapPage() {
  const overviewQuery = useFarmMapOverview();
  const areasQuery = useFarmAreas();
  const blocksQuery = useBlocks();
  const vendorsQuery = useVendors();
  const ownersQuery = useAssetOwners();

  const rows = overviewQuery.data ?? [];
  const farmAreas = areasQuery.data ?? [];
  const blocks = blocksQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const owners = ownersQuery.data ?? [];
  const loading =
    overviewQuery.isLoading ||
    areasQuery.isLoading ||
    blocksQuery.isLoading ||
    vendorsQuery.isLoading ||
    ownersQuery.isLoading;

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    const err =
      overviewQuery.error ||
      areasQuery.error ||
      blocksQuery.error ||
      vendorsQuery.error ||
      ownersQuery.error;
    if (err) toast.error(err instanceof Error ? err.message : "Could not load farm map");
  }, [
    overviewQuery.error,
    areasQuery.error,
    blocksQuery.error,
    vendorsQuery.error,
    ownersQuery.error,
  ]);

  const visible = useMemo(() => {
    let list = rows;
    const q = debounced.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.farmAreaName.toLowerCase().includes(q) ||
          r.organizationName.toLowerCase().includes(q) ||
          r.assetOwners.some((n) => n.toLowerCase().includes(q)) ||
          r.primaryVendors.some((n) => n.toLowerCase().includes(q)),
      );
    }
    if (status !== "all") list = list.filter((r) => r.status === status);
    return list;
  }, [rows, debounced, status]);

  const mapAreas = useMemo(() => {
    if (status === "all" && !debounced.trim()) return farmAreas;
    const ids = new Set(visible.map((r) => r.farmAreaId));
    return farmAreas.filter((a) => ids.has(a.id));
  }, [farmAreas, visible, status, debounced]);

  const mapBlocks = useMemo(() => {
    const areaIds = new Set(mapAreas.map((a) => a.id));
    return blocks.filter((b) => b.farmAreaId && areaIds.has(b.farmAreaId));
  }, [blocks, mapAreas]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedArea = farmAreas.find((f) => f.id === selectedAreaId) ?? null;
  const selectedRow = rows.find((r) => r.farmAreaId === selectedAreaId) ?? null;
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  useEffect(() => setPage(1), [debounced, status]);

  const onMapSelect = (selection: MapSelection | null) => {
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
        title="Farm map"
        description="Estate farm areas and blocks on the map. Select a block for details."
      />

      <SectionCard title="Map view" description="OpenStreetMap · blocks sized by hectares">
        {loading ? (
          <div className="flex h-[min(62vh,560px)] items-center justify-center text-sm text-muted-foreground">
            Loading farm structure…
          </div>
        ) : mapAreas.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPinned className="h-8 w-8 opacity-50" />
            No farm areas to plot. Add areas and blocks first.
          </div>
        ) : (
          <FarmBlockMap
            farmAreas={mapAreas}
            blocks={mapBlocks}
            selectedAreaId={selectedAreaId}
            selectedBlockId={selectedBlockId}
            onSelect={onMapSelect}
            className={selectedAreaId ? "pointer-events-none" : undefined}
          />
        )}
      </SectionCard>

      <SectionCard flush title="Farm areas">
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search farm, org, vendor, owner"
            activeFilterCount={status !== "all" ? 1 : 0}
            onClearFilters={() => setStatus("all")}
            filters={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger
                  className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[140px]"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Farm area</TableHead>
              <TableHead scope="col">Organization</TableHead>
              <TableHead scope="col">Asset owner(s)</TableHead>
              <TableHead scope="col">Primary vendor(s)</TableHead>
              <TableHead scope="col" className="text-right">
                Blocks
              </TableHead>
              <TableHead scope="col" className="text-right">
                Hectares
              </TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={6} columns={7} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={7} icon={MapPinned} title="No farm areas" />
            ) : (
              paged.map((row) => (
                <TableRow
                  key={row.farmAreaId}
                  className="cursor-pointer"
                  data-state={selectedAreaId === row.farmAreaId ? "selected" : undefined}
                  onClick={() => {
                    setSelectedAreaId(row.farmAreaId);
                    setSelectedBlockId(null);
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedAreaId(row.farmAreaId);
                      setSelectedBlockId(null);
                    }
                  }}
                >
                  <TableCell className="font-medium">{row.farmAreaName}</TableCell>
                  <TableCell>
                    <div>
                      {row.organizationName}
                      <p className="text-xs text-muted-foreground">
                        {ORG_TYPE_LABELS[row.organizationType]}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{row.assetOwners.join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm">{row.primaryVendors.join(", ") || "—"}</TableCell>
                  <TableCell className="cf-numeric text-right">{row.blocksCount}</TableCell>
                  <TableCell className="cf-numeric text-right">
                    {row.hectares.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          pageCount={pageCount}
          total={visible.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </SectionCard>

      <Sheet
        open={Boolean(selectedAreaId)}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedAreaId(null);
            setSelectedBlockId(null);
          }
        }}
      >
        <SheetContent className="z-[100] overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selectedRow?.farmAreaName ?? "Farm area"}</SheetTitle>
            <SheetDescription>
              {selectedRow?.organizationName} · {selectedRow ? `${selectedRow.hectares} ha` : ""}
              {selectedBlock ? ` · focused on ${selectedBlock.code}` : ""}
            </SheetDescription>
          </SheetHeader>
          {selectedArea ? (
            <div className="mt-6 space-y-5 text-sm">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Blocks
                </h3>
                {selectedArea.blockIds.length === 0 ? (
                  <p className="text-muted-foreground">No blocks assigned.</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedArea.blockIds.map((id) => {
                      const b = blocks.find((x) => x.id === id);
                      const focused = selectedBlockId === id;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            className={`flex w-full justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition hover:bg-secondary/50 ${
                              focused ? "border-primary bg-accent" : ""
                            }`}
                            onClick={() => setSelectedBlockId(id)}
                          >
                            <span>
                              {b?.code} · {b?.name}
                            </span>
                            <span className="cf-numeric text-muted-foreground">{b?.hectares} ha</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Vendors
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selectedArea.vendorIds.map((id) => {
                    const v = vendors.find((x) => x.id === id);
                    return (
                      <Badge key={id} variant="outline">
                        {v?.name ?? id}
                      </Badge>
                    );
                  })}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Asset owners
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selectedArea.assetOwnerIds.map((id) => {
                    const a = owners.find((x) => x.id === id);
                    return (
                      <Badge key={id} variant="secondary">
                        {a?.name ?? id}
                      </Badge>
                    );
                  })}
                </div>
              </section>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={CROPFORT_ROUTES.farmAreas}>Open farm areas</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={CROPFORT_ROUTES.blocks}>Open blocks</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
