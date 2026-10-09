"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, MessageSquare, Plus, UserRound } from "lucide-react";
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
  SectionCard,
  StatusSummaryCards,
} from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import {
  useCloseMessageThread,
  useCreateMessageThread,
  useMessageThreads,
  usePostThreadMessage,
  useReopenMessageThread,
} from "@/lib/query/hooks/use-message-threads";
import {
  allowedCounterparties,
  canAccessThread,
  COMM_PARTY_LABEL,
  partyFromRole,
  type CommParty,
  type CommThread,
} from "@/store/communicationsStore";

const PAGE_SIZE = 12;

const RELATED_TYPES: CommThread["relatedType"][] = [
  "general",
  "ticket",
  "work_order",
  "afe",
  "project",
  "intervention",
];

export default function CommunicationsView() {
  const { user, activeProgram } = useCropfortAuth();
  const party = partyFromRole(user.role);
  const threadsQuery = useMessageThreads(Boolean(activeProgram?.id));
  const threads = threadsQuery.data || [];
  const createThreadMut = useCreateMessageThread();
  const postMessageMut = usePostThreadMessage();
  const closeThreadMut = useCloseMessageThread();
  const reopenThreadMut = useReopenMessageThread();

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({
    subject: "",
    counterparty: "" as "" | Exclude<CommParty, "spx">,
    relatedType: "general" as CommThread["relatedType"],
    relatedCode: "",
    body: "",
  });
  const endRef = useRef<HTMLDivElement>(null);

  const counterparts = allowedCounterparties(party);

  const visible = useMemo(() => {
    const mine = threads.filter((t) => canAccessThread(t, party));
    const q = debounced.trim().toLowerCase();
    if (!q) return mine;
    return mine.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        (t.relatedCode?.toLowerCase().includes(q) ?? false) ||
        COMM_PARTY_LABEL[t.counterparty].toLowerCase().includes(q),
    );
  }, [threads, party, debounced]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    if (!form.counterparty && counterparts[0]) {
      setForm((f) => ({ ...f, counterparty: counterparts[0] }));
    }
  }, [counterparts, form.counterparty]);

  const selected =
    (selectedId && visible.find((t) => t.id === selectedId)) ||
    visible[0] ||
    null;

  useEffect(() => {
    if (selected && selectedId !== selected.id) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const threadMessages = useMemo(() => {
    const msgs = (selected as { messages?: { id: string; threadId: string; at: string; authorId: string; authorName: string; authorParty: CommParty; body: string }[] } | null)
      ?.messages;
    return (msgs || []).slice().sort((a, b) => a.at.localeCompare(b.at));
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length, selected?.id]);

  const openCount = visible.filter((t) => !t.closed).length;

  const sendReply = () => {
    if (!selected) return;
    void postMessageMut
      .mutateAsync({ threadId: selected.id, body: reply })
      .then(() => setReply(""))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not send"),
      );
  };

  const create = () => {
    if (!form.subject.trim() || !form.body.trim() || !form.counterparty) {
      toast.error("Subject, channel, and message are required");
      return;
    }
    void createThreadMut
      .mutateAsync({
        subject: form.subject,
        counterparty: form.counterparty,
        relatedType: form.relatedType,
        relatedCode: form.relatedCode || null,
        body: form.body,
      })
      .then((row) => {
        setComposeOpen(false);
        setForm({
          subject: "",
          counterparty: counterparts[0] ?? "vendor",
          relatedType: "general",
          relatedCode: "",
          body: "",
        });
        setSelectedId(row.id);
        toast.success("Thread opened");
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not create thread"),
      );
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Execution"}
        title="Communications"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Communications" },
        ]}
        actions={
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New thread
          </Button>
        }
      />

      <StatusSummaryCards
        label="Communications"
        columns={3}
        items={[
          {
            id: "threads",
            label: "Threads",
            value: String(visible.length),
            icon: MessageSquare,
            emphasis: true,
          },
          {
            id: "open",
            label: "Open",
            value: String(openCount),
            icon: Inbox,
          },
          {
            id: "desk",
            label: "Desk",
            value: COMM_PARTY_LABEL[party],
            icon: UserRound,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <SectionCard flush>
          <div className="border-b px-4 py-3">
            <TableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search…"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Subject</TableHead>
                <TableHead scope="col">Channel</TableHead>
                <TableHead scope="col">Related</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableMessageRow
                  colSpan={5}
                  icon={MessageSquare}
                  title="None"
                />
              ) : (
                paged.map((t) => (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "cursor-pointer",
                      selected?.id === t.id && "bg-primary/[0.06]",
                    )}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell className="text-sm">
                      SPX ↔ {COMM_PARTY_LABEL[t.counterparty]}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.relatedCode || t.relatedType}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={t.closed ? "archived" : "active"}
                        label={t.closed ? "Closed" : "Open"}
                      />
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {new Date(t.updatedAt).toLocaleDateString()}
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

        <SectionCard title={selected ? selected.subject : "Thread"}>
          {!selected ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <div className="flex h-[min(28rem,60vh)] flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {threadMessages.map((m) => {
                  const mine = m.authorParty === party;
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
                          mine
                            ? "border-primary/30 bg-primary/10"
                            : "border-border bg-muted/40",
                        )}
                      >
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {m.authorName} · {COMM_PARTY_LABEL[m.authorParty]} ·{" "}
                          {new Date(m.at).toLocaleString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="mt-3 space-y-2 border-t pt-3">
                {!selected.closed ? (
                  <>
                    <Textarea
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply…"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={sendReply} disabled={!reply.trim()}>
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void closeThreadMut
                            .mutateAsync(selected.id)
                            .then(() => toast.message("Thread closed"))
                            .catch((e) =>
                              toast.error(e instanceof Error ? e.message : "Close failed"),
                            );
                        }}
                      >
                        Close thread
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">Closed</p>
                    {party === "spx" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void reopenThreadMut
                            .mutateAsync(selected.id)
                            .then(() => toast.success("Thread reopened"))
                            .catch((e) =>
                              toast.error(e instanceof Error ? e.message : "Reopen failed"),
                            );
                        }}
                      >
                        Reopen
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New thread</DialogTitle>
          </DialogHeader>
          <FormField
            label="Subject"
            required
            render={(p) => (
              <Input
                {...p}
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            )}
          />
          <FormField
            label="Channel"
            required
            render={() => (
              <Select
                value={form.counterparty || counterparts[0]}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    counterparty: v as Exclude<CommParty, "spx">,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {counterparts.map((c) => (
                    <SelectItem key={c} value={c}>
                      SPX ↔ {COMM_PARTY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Related to"
            render={() => (
              <Select
                value={form.relatedType}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    relatedType: v as CommThread["relatedType"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATED_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Related code"
            optional
            render={(p) => (
              <Input
                {...p}
                value={form.relatedCode}
                onChange={(e) => setForm((f) => ({ ...f, relatedCode: e.target.value }))}
                placeholder="Code"
              />
            )}
          />
          <FormField
            label="Message"
            required
            render={(p) => (
              <Textarea
                {...p}
                rows={4}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
