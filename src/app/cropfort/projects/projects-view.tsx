"use client";

import Link from "next/link";
import { FolderKanban, MoreHorizontal, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import {
  fmtEtb,
  projectVendorOptions,
  useCropfortOpsStore,
} from "@/store/cropfortOpsStore";

const PAGE_SIZE = 12;

export default function ProjectsView() {
  const { activeProgram } = useCropfortAuth();
  const area = getCropfortArea("projects");

  const projects = useCropfortOpsStore((s) => s.projects);
  const search = useCropfortOpsStore((s) => s.projectsSearch);
  const page = useCropfortOpsStore((s) => s.projectsPage);
  const createOpen = useCropfortOpsStore((s) => s.projectsCreateOpen);
  const manageId = useCropfortOpsStore((s) => s.projectsManageId);
  const form = useCropfortOpsStore((s) => s.projectsForm);
  const blockName = useCropfortOpsStore((s) => s.blockName);
  const activeBlocks = useCropfortOpsStore((s) => s.activeBlocks);
  const createProject = useCropfortOpsStore((s) => s.createProject);
  const submitProject = useCropfortOpsStore((s) => s.submitProject);
  const startProject = useCropfortOpsStore((s) => s.startProject);
  const toggleMilestone = useCropfortOpsStore((s) => s.toggleMilestone);
  const raiseAfe = useCropfortOpsStore((s) => s.raiseAfe);
  const afeForSource = useCropfortOpsStore((s) => s.afeForSource);
  const setProjectsSearch = useCropfortOpsStore((s) => s.setProjectsSearch);
  const setProjectsPage = useCropfortOpsStore((s) => s.setProjectsPage);
  const setProjectsCreateOpen = useCropfortOpsStore((s) => s.setProjectsCreateOpen);
  const setProjectsManageId = useCropfortOpsStore((s) => s.setProjectsManageId);
  const patchProjectsForm = useCropfortOpsStore((s) => s.patchProjectsForm);

  const blocks = activeBlocks();
  const vendors = projectVendorOptions();

  const q = search.trim().toLowerCase();
  const visible = !q
    ? projects
    : projects.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q) ||
          blockName(p.blockId).toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q),
      );

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const stats = {
    total: projects.length,
    open: projects.filter((p) => p.status !== "complete").length,
    waiting: projects.filter((p) => p.status === "submitted").length,
  };

  const managed = manageId ? projects.find((p) => p.id === manageId) ?? null : null;
  const linkedAfe = managed ? afeForSource("project", managed.id) : undefined;
  const canEditMilestones =
    managed && (managed.status === "approved" || managed.status === "in_progress");

  const create = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.blockId) {
      toast.error("Select a block");
      return;
    }
    const budget = Number(form.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      toast.error("Enter a valid budget");
      return;
    }
    const row = createProject({
      title: form.title.trim(),
      blockId: form.blockId,
      vendor: form.vendor || vendors[0] || "Vendor",
      budgetEtb: budget,
      notes: form.notes.trim(),
    });
    toast.success(`${row.code} created as draft`);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label },
        ]}
        meta={
          <PageMetaStrip
            items={[
              { value: String(stats.total), label: "Projects" },
              { value: String(stats.open), label: "Open" },
              { value: String(stats.waiting), label: "Awaiting approval" },
            ]}
          />
        }
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.approvals}>Approvals</Link>
            </Button>
            <Button
              size="sm"
              onClick={() => setProjectsCreateOpen(true)}
              disabled={!blocks.length}
            >
              <Plus className="h-3.5 w-3.5" />
              New project
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
            onSearchChange={setProjectsSearch}
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
                Budget
              </TableHead>
              <TableHead scope="col">Band</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">AFE</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableMessageRow colSpan={9} icon={FolderKanban} title="No projects yet" />
            ) : (
              paged.map((p) => {
                const afe = afeForSource("project", p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {blockName(p.blockId)}
                    </TableCell>
                    <TableCell>{p.vendor}</TableCell>
                    <TableCell className="cf-numeric text-right">{fmtEtb(p.budgetEtb)}</TableCell>
                    <TableCell>{p.band}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
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
                            aria-label={`Actions for ${p.code}`}
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setProjectsManageId(p.id)}>
                            Manage
                          </DropdownMenuItem>
                          {(p.status === "draft" || p.status === "returned") && (
                            <DropdownMenuItem
                              onClick={() => {
                                submitProject(p.id);
                                toast.success("Submitted to Approvals");
                              }}
                            >
                              Submit for approval
                            </DropdownMenuItem>
                          )}
                          {p.status === "submitted" && (
                            <DropdownMenuItem asChild>
                              <Link href={CROPFORT_ROUTES.approvals}>Open Approvals</Link>
                            </DropdownMenuItem>
                          )}
                          {p.status === "approved" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  const row = raiseAfe({
                                    title: p.title,
                                    sourceType: "project",
                                    sourceId: p.id,
                                    blockId: p.blockId,
                                    amountEtb: p.budgetEtb,
                                  });
                                  toast.success(`${row.code} ready — open AFE`);
                                }}
                              >
                                Raise AFE
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  startProject(p.id);
                                  toast.success("Project in progress");
                                }}
                              >
                                Start work
                              </DropdownMenuItem>
                            </>
                          )}
                          {(p.status === "approved" || p.status === "in_progress") && (
                            <>
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
          onPageChange={setProjectsPage}
        />
      </SectionCard>

      <Dialog open={createOpen} onOpenChange={setProjectsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <FormField
            label="Title"
            required
            render={(props) => (
              <Input
                {...props}
                value={form.title}
                onChange={(e) => patchProjectsForm({ title: e.target.value })}
              />
            )}
          />
          <FormField
            label="Block"
            required
            render={() => (
              <Select
                value={form.blockId}
                onValueChange={(blockId) => patchProjectsForm({ blockId })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.code} · {b.name}
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
                onValueChange={(vendor) => patchProjectsForm({ vendor })}
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
            label="Budget (ETB)"
            required
            render={(props) => (
              <Input
                {...props}
                type="number"
                min={1}
                value={form.budget}
                onChange={(e) => patchProjectsForm({ budget: e.target.value })}
              />
            )}
          />
          <FormField
            label="Notes"
            optional
            render={(props) => (
              <Textarea
                {...props}
                rows={2}
                value={form.notes}
                onChange={(e) => patchProjectsForm({ notes: e.target.value })}
              />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.title.trim() || !form.blockId}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(managed)}
        onOpenChange={(o) => !o && setProjectsManageId(null)}
      >
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
                    {blockName(managed.blockId)} · {managed.vendor} ·{" "}
                    {fmtEtb(managed.budgetEtb)}
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
                  {managed.milestones.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <Checkbox
                        checked={m.done}
                        disabled={!canEditMilestones}
                        onCheckedChange={() => toggleMilestone(managed.id, m.id)}
                      />
                      <span
                        className={cn("text-sm", m.done && "text-muted-foreground line-through")}
                      >
                        {m.title}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(managed.status === "draft" || managed.status === "returned") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        submitProject(managed.id);
                        toast.success("Submitted to Approvals");
                      }}
                    >
                      Submit for approval
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
                            sourceType: "project",
                            sourceId: managed.id,
                            blockId: managed.blockId,
                            amountEtb: managed.budgetEtb,
                          });
                          toast.success(`${afe.code} drafted`);
                        }}
                      >
                        Raise AFE
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          startProject(managed.id);
                          toast.success("Project in progress");
                        }}
                      >
                        Start work
                      </Button>
                    </>
                  )}
                  {managed.status === "in_progress" && !linkedAfe && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const afe = raiseAfe({
                          title: managed.title,
                          sourceType: "project",
                          sourceId: managed.id,
                          blockId: managed.blockId,
                          amountEtb: managed.budgetEtb,
                        });
                        toast.success(`${afe.code} drafted`);
                      }}
                    >
                      Raise AFE
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProjectsManageId(null)}>
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
