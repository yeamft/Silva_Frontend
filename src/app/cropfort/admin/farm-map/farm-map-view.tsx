"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  getAssetOwners,
  getBlocks,
  getFarmAreas,
  getFarmMapOverview,
  getVendors,
} from "@/lib/api/org-map";
import type { FarmArea, FarmBlockRef, FarmMapRow, VendorRecord, AssetOwner } from "@/types/cropfort-modules";
import { ORG_TYPE_LABELS } from "@/types/cropfort-modules";

const PAGE_SIZE = 10;

export default function FarmMapPage() {
  const [rows, setRows] = useState<FarmMapRow[]>([]);
  const [farmAreas, setFarmAreas] = useState<FarmArea[]>([]);
  const [blocks, setBlocks] = useState<FarmBlockRef[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [owners, setOwners] = useState<AssetOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, areas, blks, vnds, aos] = await Promise.all([
        getFarmMapOverview(),
        getFarmAreas(),
        getBlocks(),
        getVendors(),
        getAssetOwners(),
      ]);
      setRows(overview);
      setFarmAreas(areas);
      setBlocks(blks);
      setVendors(vnds);
      setOwners(aos);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load farm map");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    let list = rows;
    const q = debounced.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.farmAreaName.toLowerCase().includes(q) ||
          r.organizationName.toLowerCase().includes(q) ||
          r.assetOwners.some((n) => n.toLowerCase().includes(q)) ||
          r.primaryVendors.some((n) => n.toLowerCase().includes(q))
      );
    }
    if (status !== "all") list = list.filter((r) => r.status === status);
    return list;
  }, [rows, debounced, status]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedArea = farmAreas.find((f) => f.id === selectedId) ?? null;
  const selectedRow = rows.find((r) => r.farmAreaId === selectedId) ?? null;

  useEffect(() => setPage(1), [debounced, status]);

  return (
    <PageContainer>
      <PageHeader title="Farm map" />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search farm, org, vendor, owner"
            activeFilterCount={status !== "all" ? 1 : 0}
            onClearFilters={() => setStatus("all")}
            filters={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[140px]" aria-label="Filter by status">
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
                  onClick={() => setSelectedId(row.farmAreaId)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(row.farmAreaId);
                    }
                  }}
                >
                  <TableCell className="font-medium">{row.farmAreaName}</TableCell>
                  <TableCell>
                    <div>
                      {row.organizationName}
                      <p className="text-xs text-muted-foreground">{ORG_TYPE_LABELS[row.organizationType]}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{row.assetOwners.join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm">{row.primaryVendors.join(", ") || "—"}</TableCell>
                  <TableCell className="cf-numeric text-right">{row.blocksCount}</TableCell>
                  <TableCell className="cf-numeric text-right">{row.hectares.toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination page={page} pageCount={pageCount} total={visible.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </SectionCard>

      <Sheet open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{selectedRow?.farmAreaName ?? "Farm area"}</SheetTitle>
            <SheetDescription>
              {selectedRow?.organizationName} · {selectedRow ? `${selectedRow.hectares} ha` : ""}
            </SheetDescription>
          </SheetHeader>
          {selectedArea ? (
            <div className="mt-6 space-y-5 text-sm">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blocks</h3>
                {selectedArea.blockIds.length === 0 ? (
                  <p className="text-muted-foreground">No blocks assigned.</p>
                ) : (
                  <ul className="space-y-1">
                    {selectedArea.blockIds.map((id) => {
                      const b = blocks.find((x) => x.id === id);
                      return (
                        <li key={id} className="flex justify-between gap-2 rounded-md border px-2 py-1.5">
                          <span>
                            {b?.code} · {b?.name}
                          </span>
                          <span className="cf-numeric text-muted-foreground">{b?.hectares} ha</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendors</h3>
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
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset owners</h3>
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
              <Button asChild variant="outline" size="sm">
                <Link href={CROPFORT_ROUTES.farmAreas}>Open farm areas</Link>
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
