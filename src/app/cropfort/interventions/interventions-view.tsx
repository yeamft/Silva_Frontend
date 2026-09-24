"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  TableMessageRow,
  TablePagination,
  TableToolbar,
} from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import {
  PageContainer,
  PageHeader,
  PageMetaStrip,
  SectionCard,
} from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useBlocks, useVendors } from "@/lib/query";
import { cn } from "@/lib/utils";
import {
  fmtEtb,
  useCropfortOpsStore,
  type Intervention,
} from "@/store/cropfortOpsStore";

const PAGE_SIZE = 12;
const FALLBACK_VENDORS = ["RFSP", "GreenLine", "Estate crew"];

export default function InterventionsView() {
  const { activeProgram } = useCropfortAuth();
  const area = getCropfortArea("interventions");
  const items = useCropfortOpsStore((s) => s.interventions);
  const nodes = useCropfortOpsStore((s) => s.nodes);
  const createIntervention = useCropfortOpsStore((s) => s.createIntervention);
  const startIntervention = useCropfortOpsStore((s) => s.startIntervention);
  const submitIntervention = useCropfortOpsStore((s) => s.submitIntervention);
  const completeIntervention = useCropfortOpsStore((s) => s.completeIntervention);
  const toggleStep = useCropfortOpsStore((s) => s.toggleStep);
  const raiseAfe = useCropfortOpsStore((s) => s.raiseAfe);
  const afeForSource = useCropfortOpsStore((s) => s.afeForSource);

  const blocksQuery = useBlocks();
  const vendorsQuery = useVendors();

  const adminBlocks = useMemo(
    () => (blocksQuery.data ?? []).filter((b) => b.status !== "inactive"),
    [blocksQuery.data],
  );
  const storeBlocks = useMemo(
    () => nodes.filter((n) => n.kind === "block" && n.status === "active"),
    [nodes],
  );
  const blocks = adminBlocks.length
    ? adminBlocks.map((b) => ({ id: b.id, name: `${b.code} · ${b.name}` }))
    : storeBlocks.map((b) => ({ id: b.id, name: b.name }));

  const vendors = useMemo(() => {
    const fromApi = (vendorsQuery.data ?? [])
      .filter((v) => v.status === "active" || v.status === "pending")
      .map((v) => v.name);
    return fromApi.length ? fromApi : FALLBACK_VENDORS;
  }, [vendorsQuery.data]);

  const resolveBlock = (blockId: string) => {
    const admin = adminBlocks.find((b) => b.id === blockId);
    if (admin) return `${admin.code} · ${admin.name}`;
    return storeBlocks.find((b) => b.id === blockId)?.name ?? blockId;
  };

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [manage, setManage] = useState<Intervention | null>(null);
  const [form, setForm] = useState({ title: "", blockId: "", vendor: "", cost: "15000" });

  useEffect(() => {
    if (!form.blockId && blocks[0]) {
      setForm((f) => ({
        ...f,
        blockId: blocks[0].id,
        vendor: f.vendor || vendors[0] || "",
      }));
    }
  }, [blocks, vendors, form.blockId]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    if (manage) {
      const fresh = items.find((i) => i.id === manage.id) ?? null;
      setManage(fresh);
    }
  }, [items, manage?.id]);

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.vendor.toLowerCase().includes(q) ||
        resolveBlock(i.blockId).toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q),
    );
  }, [items, debounced, adminBlocks, storeBlocks]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  const stats = useMemo(
    () => ({
      total: items.length,
      live: items.filter((i) => i.status === "active" || i.status === "draft").length,
      waiting: items.filter((i) => i.status === "submitted").length,
    }),
    [items],
  );

  const managed = manage ? items.find((i) => i.id === manage.id) ?? manage : null;
  const linkedAfe = managed ? afeForSource("intervention", managed.id) : undefined;
  const canEditSteps =
    managed &&
    (managed.status === "draft" ||
      managed.status === "active" ||
      managed.status === "returned" ||
      managed.status === "approved");
  const stepsDone = managed ? managed.steps.every((s) => s.done) : false;

  const create = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.blockId) {
      toast.error("Select a block");
      return;
    }
    const cost = Number(form.cost);
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error("Enter a valid cost");
      return;
    }
    const row = createIntervention({
      title: form.title.trim(),
      blockId: form.blockId,
      vendor: form.vendor || vendors[0] || "Vendor",
      costEtb: cost,
    });
    setCreateOpen(false);
    setForm({
      title: "",
      blockId: blocks[0]?.id ?? "",
      vendor: vendors[0] ?? "",
      cost: "15000",
    });
    setManage(row);
    toast.success(`${row.code} drafted`);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Control"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label },
        ]}
        meta={
          <PageMetaStrip
            items={[
              { value: String(stats.total), label: "Interventions" },
              { value: String(stats.live), label: "Draft / active" },
              { value: String(stats.waiting), label: "Awaiting sign-off" },
            ]}
          />
        }
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.approvals}>Approvals</Link>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!blocks.length}>
              <Plus className="h-3.5 w-3.5" />
              New intervention
            </Button>
          </>
        }
      />

      {!blocks.length ? (
        <p className="mb-3 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          No blocks available. Add blocks under{" "}
          <Link className="underline" href={CROPFORT_ROUTES.blocks}>
            Administration → Blocks
          </Link>
          .
        </p>
      ) : null}

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, code, block, vendor, status"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Code</TableHead>
              <TableHead scope="col">Title</TableHead>
              <TableHead scope="col">Block</TableHead>
              <TableHead scope="col">Vendor</TableHead>
              <TableHead scope="col" className="text-right">
                Cost
              </TableHead>
              <TableHead scope="col">Steps</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">AFE</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableMessageRow colSpan={9} icon={Zap} title="No interventions yet" />
            ) : (
              paged.map((row) => {
                const afe = afeForSource("intervention", row.id);
                const done = row.steps.filter((s) => s.done).length;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {resolveBlock(row.blockId)}
                    </TableCell>
                    <TableCell>{row.vendor}</TableCell>
                    <TableCell className="cf-numeric text-right">
                      {fmtEtb(row.costEtb)}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {done}/{row.steps.length}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {afe ? afe.code : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Actions for ${row.code}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setManage(row)}>
                            Manage
                          </DropdownMenuItem>
                          {(row.status === "draft" || row.status === "returned") && (
                            <DropdownMenuItem
                              onClick={() => {
                                startIntervention(row.id);
                                toast.success(
                                  row.status === "returned" ? "Resumed" : "Started",
                                );
                              }}
                            >
                              {row.status === "returned" ? "Resume" : "Start"}
                            </DropdownMenuItem>
                          )}
                          {row.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => {
                                submitIntervention(row.id);
                                toast.success("Sent to Approvals");
                              }}
                            >
                              Submit for sign-off
                            </DropdownMenuItem>
                          )}
                          {row.status === "returned" && (
                            <DropdownMenuItem
                              onClick={() => {
                                submitIntervention(row.id);
                                toast.success("Resubmitted to Approvals");
                              }}
                            >
                              Resubmit
                            </DropdownMenuItem>
                          )}
                          {row.status === "submitted" && (
                            <DropdownMenuItem asChild>
                              <Link href={CROPFORT_ROUTES.approvals}>Open Approvals</Link>
                            </DropdownMenuItem>
                          )}
                          {row.status === "approved" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  const afeRow = raiseAfe({
                                    title: row.title,
                                    sourceType: "intervention",
                                    sourceId: row.id,
                                    blockId: row.blockId,
                                    amountEtb: row.costEtb,
                                  });
                                  toast.success(`${afeRow.code} ready`);
                                }}
                              >
                                Raise AFE
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!row.steps.every((s) => s.done)}
                                onClick={() => {
                                  completeIntervention(row.id);
                                  toast.success("Intervention complete");
                                }}
                              >
                                Mark complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={CROPFORT_ROUTES.afe}>Go to AFE</Link>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New intervention</DialogTitle>
          </DialogHeader>
          <FormField
            label="Title"
            required
            render={(props) => (
              <Input
                {...props}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            )}
          />
          <FormField
            label="Block"
            required
            render={() => (
              <Select
                value={form.blockId}
                onValueChange={(blockId) => setForm((f) => ({ ...f, blockId }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Vendor"
            render={() => (
              <Select
                value={form.vendor || vendors[0]}
                onValueChange={(vendor) => setForm((f) => ({ ...f, vendor }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Cost (ETB)"
            required
            render={(props) => (
              <Input
                {...props}
                type="number"
                min={1}
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.title.trim() || !form.blockId}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(managed)} onOpenChange={(o) => !o && setManage(null)}>
        <DialogContent className="sm:max-w-lg">
          {managed ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {managed.code} · {managed.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={managed.status} />
                  <span className="text-muted-foreground">
                    {resolveBlock(managed.blockId)} · {managed.vendor} ·{" "}
                    {fmtEtb(managed.costEtb)}
                  </span>
                </div>
                {linkedAfe ? (
                  <p className="text-xs text-muted-foreground">
                    Linked AFE{" "}
                    <Link className="underline" href={CROPFORT_ROUTES.afe}>
                      {linkedAfe.code}
                    </Link>
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {managed.steps.map((step) => (
                    <li
                      key={step.id}
                      className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3"
                    >
                      <Checkbox
                        checked={step.done}
                        disabled={!canEditSteps || managed.status === "submitted"}
                        onCheckedChange={() => toggleStep(managed.id, step.id)}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          step.done && "text-muted-foreground line-through",
                        )}
                      >
                        {step.title}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(managed.status === "draft" || managed.status === "returned") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        startIntervention(managed.id);
                        toast.success(
                          managed.status === "returned" ? "Resumed" : "Started",
                        );
                      }}
                    >
                      <Zap className="h-4 w-4" />
                      {managed.status === "returned" ? "Resume" : "Start"}
                    </Button>
                  )}
                  {managed.status === "active" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        submitIntervention(managed.id);
                        toast.success("Sent to Approvals");
                      }}
                    >
                      Submit for sign-off
                    </Button>
                  )}
                  {managed.status === "returned" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        submitIntervention(managed.id);
                        toast.success("Resubmitted");
                      }}
                    >
                      Resubmit
                    </Button>
                  )}
                  {managed.status === "submitted" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={CROPFORT_ROUTES.approvals}>Open Approvals</Link>
                    </Button>
                  )}
                  {managed.status === "approved" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          const afe = raiseAfe({
                            title: managed.title,
                            sourceType: "intervention",
                            sourceId: managed.id,
                            blockId: managed.blockId,
                            amountEtb: managed.costEtb,
                          });
                          toast.success(`${afe.code} drafted`);
                        }}
                      >
                        Raise AFE
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!stepsDone}
                        onClick={() => {
                          completeIntervention(managed.id);
                          toast.success("Intervention complete");
                        }}
                      >
                        Mark complete
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManage(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
