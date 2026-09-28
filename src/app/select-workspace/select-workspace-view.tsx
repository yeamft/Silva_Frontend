"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CheckSquare,
  ChevronDown,
  Layers3,
  Loader2,
  LogOut,
  Pin,
  Search,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildWorkspaceQuickOpens,
  preferredProgramId,
  type WorkspaceInboxItem,
} from "@/lib/cropfort/workspace-inbox";
import {
  formatRelativeOpened,
  loadWorkspacePreferences,
  markProgramOpened,
  sortProgramsByPreference,
  togglePinnedProgram,
  type WorkspacePreferences,
} from "@/lib/cropfort/workspace-preferences";
import { useWorkspaceInboxLive } from "@/lib/query/hooks/use-workspace-inbox-live";
import {
  clearWorkspaceSelectionRequired,
  WORKSPACE_HOME_PATH,
} from "@/lib/workspace-gate";
import { cn } from "@/lib/utils";
import type { AuthProgram } from "@/lib/api/types";
import { useAuthStore } from "@/store/authStore";

const ease = [0.16, 1, 0.36, 1] as const;

type Tab = "attention" | "recent" | "all";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function WorkspaceCard({
  program,
  active,
  busy,
  disabled,
  pinned,
  attentionCount,
  lastOpenedLabel,
  onOpen,
  onTogglePin,
}: {
  program: AuthProgram;
  active: boolean;
  busy: boolean;
  disabled: boolean;
  pinned: boolean;
  attentionCount: number;
  lastOpenedLabel: string | null;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-xs",
        "transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-card",
        active && "border-primary/40 ring-1 ring-primary/20",
        disabled && !busy && "opacity-55",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onOpen}
        className="flex w-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/15 via-accent to-muted"
          aria-hidden
        >
          <div className="cf-grid-lines absolute inset-0 opacity-30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/90 text-base font-semibold text-primary shadow-xs backdrop-blur-sm">
              {initials(program.name)}
            </span>
          </div>
          {attentionCount > 0 ? (
            <span className="absolute right-2.5 top-2.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold tabular-nums text-background">
              {attentionCount}
            </span>
          ) : null}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
        </div>
      </button>
      <div className="flex items-start gap-2 px-3.5 py-3">
        <button
          type="button"
          disabled={disabled}
          onClick={onOpen}
          className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="truncate text-sm font-semibold tracking-tight">{program.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {program.roleInProgram || program.slug}
            {lastOpenedLabel ? ` · ${lastOpenedLabel}` : active ? " · Last used" : ""}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={program.status || "active"} />
          <button
            type="button"
            aria-label={pinned ? `Unpin ${program.name}` : `Pin ${program.name}`}
            aria-pressed={pinned}
            disabled={disabled}
            onClick={onTogglePin}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              pinned && "text-primary",
            )}
          >
            <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function QueueList({
  items,
  busy,
  onOpenItem,
}: {
  items: WorkspaceInboxItem[];
  busy: boolean;
  onOpenItem: (href: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        <CheckSquare className="h-4 w-4 text-success" />
        Nothing waiting on you
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-card">
      {items.map((item) => (
        <li key={item.id} className="border-b border-border last:border-b-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenItem(item.href)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-foreground">
              {item.count}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function SelectWorkspaceView() {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const me = useAuthStore((s) => s.me);
  const user = useAuthStore((s) => s.user);
  const switchProgram = useAuthStore((s) => s.switchProgram);
  const logout = useAuthStore((s) => s.logout);

  const { items: inbox, total: attentionCount } = useWorkspaceInboxLive(isAuthenticated);

  const [pickingId, setPickingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [prefs, setPrefs] = useState<WorkspacePreferences>({
    pinnedProgramIds: [],
    lastOpenedAtByProgramId: {},
  });

  const userId = user?.id || me?.user?.id || "anon";
  const programs = useMemo(
    () => (me?.programs ?? []).filter((p) => p.status !== "archived"),
    [me?.programs],
  );
  const userName = user?.name || user?.email || "Account";
  const userRole = user?.role || me?.user?.role || "";
  const activeId = me?.activeProgram?.id;
  const homeProgramId = preferredProgramId(programs, activeId);
  const quickOpens = useMemo(() => buildWorkspaceQuickOpens(userRole), [userRole]);

  useEffect(() => {
    if (!isHydrated) return;
    setPrefs(loadWorkspacePreferences(userId));
  }, [isHydrated, userId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = sortProgramsByPreference(programs, prefs);

    if (tab === "recent") {
      list = list
        .filter(
          (p) =>
            prefs.lastOpenedAtByProgramId[p.id] ||
            p.id === activeId ||
            prefs.pinnedProgramIds.includes(p.id),
        )
        .sort((a, b) => {
          const aOpen =
            prefs.lastOpenedAtByProgramId[a.id] ?? (a.id === activeId ? Date.now() : 0);
          const bOpen =
            prefs.lastOpenedAtByProgramId[b.id] ?? (b.id === activeId ? Date.now() : 0);
          return bOpen - aOpen;
        });
      if (list.length === 0) list = sortProgramsByPreference(programs, prefs).slice(0, 6);
    }

    if (tab === "attention" && attentionCount > 0 && homeProgramId) {
      const first = list.find((p) => p.id === homeProgramId);
      const rest = list.filter((p) => p.id !== homeProgramId);
      list = first ? [first, ...rest] : list;
    }

    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.roleInProgram || "").toLowerCase().includes(q),
    );
  }, [programs, query, tab, activeId, attentionCount, homeProgramId, prefs]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  const enter = async (programId: string, deepLink?: string) => {
    if (pickingId) return;
    setPickingId(programId);
    const result = await switchProgram(programId);
    if (result.ok === false) {
      setPickingId(null);
      const message = "error" in result ? result.error : "Could not open workspace — try again";
      toast.error(message || "Could not open workspace — try again");
      return;
    }
    const nextPrefs = markProgramOpened(userId, programId);
    setPrefs(nextPrefs);
    clearWorkspaceSelectionRequired();
    const name = programs.find((p) => p.id === programId)?.name;
    toast.success(name ? `Opened ${name}` : "Workspace ready");
    router.replace(deepLink || WORKSPACE_HOME_PATH);
  };

  const enterPreferred = (deepLink?: string) => {
    const id = homeProgramId;
    if (!id) {
      toast.error("No workspace assigned");
      return;
    }
    void enter(id, deepLink);
  };

  const onTogglePin = (programId: string) => {
    const next = togglePinnedProgram(userId, programId);
    setPrefs(next);
    const pinned = next.pinnedProgramIds.includes(programId);
    toast.success(pinned ? "Pinned workspace" : "Unpinned workspace");
  };

  const signOut = async () => {
    clearWorkspaceSelectionRequired();
    await logout();
    router.replace("/login");
  };

  const cardAttention = (programId: string) =>
    programId === homeProgramId ? attentionCount : 0;

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card md:flex",
          sidebarOpen ? "w-[15.5rem]" : "w-[4.25rem]",
        )}
      >
        <div className="border-b border-border px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted/60"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Account"
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {initials(userName)}
              {attentionCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-card" />
              ) : null}
            </span>
            {sidebarOpen ? (
              <>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{userName}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </>
            ) : null}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          <div className="relative px-1 pb-2">
            {sidebarOpen ? (
              <>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="h-9 border-border/80 bg-muted/40 pl-8 text-sm"
                  aria-label="Search workspaces"
                />
              </>
            ) : (
              <Button
                size="icon-sm"
                variant="ghost"
                className="mx-auto"
                onClick={() => setSidebarOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p
            className={cn(
              "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
              !sidebarOpen && "sr-only",
            )}
          >
            Browse
          </p>
          <button
            type="button"
            onClick={() => setInboxOpen(true)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              inboxOpen
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Bell className="h-4 w-4 shrink-0" />
            {sidebarOpen ? (
              <span className="flex flex-1 items-center justify-between gap-2">
                Inbox
                {attentionCount > 0 ? (
                  <span className="rounded-md bg-foreground px-1.5 text-[10px] font-semibold tabular-nums text-background">
                    {attentionCount}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab("recent")}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              tab === "recent"
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Layers3 className="h-4 w-4 shrink-0" />
            {sidebarOpen ? "Recents" : null}
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              tab === "all"
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Layers3 className="h-4 w-4 shrink-0" />
            {sidebarOpen ? "All workspaces" : null}
          </button>

          {sidebarOpen ? (
            <>
              <p className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick open
              </p>
              {quickOpens.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!!pickingId || !homeProgramId}
                  onClick={() => enterPreferred(item.href)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </>
          ) : null}
        </nav>

        <div className="mt-auto space-y-1 border-t border-border p-2">
          {sidebarOpen ? (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Sprout className="h-3.5 w-3.5 text-primary" />
              Cropfort
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2", !sidebarOpen && "justify-center px-0")}
            onClick={() => void signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            {sidebarOpen ? "Sign out" : null}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mx-auto max-w-6xl"
          >
            <div className="mb-6 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workspaces"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  {tab === "recent" ? "Recently opened" : "Your workspaces"}
                </h2>
              
              </div>
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                <Button
                  size="sm"
                  variant={tab === "recent" ? "secondary" : "ghost"}
                  className="h-8"
                  onClick={() => setTab("recent")}
                >
                  Recent
                </Button>
                <Button
                  size="sm"
                  variant={tab === "all" || tab === "attention" ? "secondary" : "ghost"}
                  className="h-8"
                  onClick={() => setTab("all")}
                >
                  All
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-xs">
                <Layers3 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm font-medium">
                  {programs.length === 0 ? "No workspaces assigned" : "No matches"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {programs.length === 0
                    ? "Ask your SPX admin to add you to a programme, then sign in again."
                    : "Try a different search."}
                </p>
                {programs.length === 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((program, i) => (
                  <motion.li
                    key={program.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.03 * i, ease }}
                  >
                    <WorkspaceCard
                      program={program}
                      active={program.id === activeId}
                      busy={pickingId === program.id}
                      disabled={!!pickingId}
                      pinned={prefs.pinnedProgramIds.includes(program.id)}
                      attentionCount={cardAttention(program.id)}
                      lastOpenedLabel={formatRelativeOpened(
                        prefs.lastOpenedAtByProgramId[program.id],
                      )}
                      onOpen={() => void enter(program.id)}
                      onTogglePin={() => onTogglePin(program.id)}
                    />
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </main>
      </div>

      <Sheet open={inboxOpen} onOpenChange={setInboxOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-6 py-5 text-left">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Your queue
              {attentionCount > 0 ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                  {attentionCount}
                </span>
              ) : null}
            </SheetTitle>
            <SheetDescription>
              Approvals, AFE, validation, and tickets waiting on you. Open one to enter your
              workspace.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <QueueList
              items={inbox}
              busy={!!pickingId}
              onOpenItem={(href) => {
                setInboxOpen(false);
                enterPreferred(href);
              }}
            />
          </div>
          {homeProgramId ? (
            <div className="border-t border-border p-4">
              <Button
                className="w-full"
                disabled={!!pickingId}
                onClick={() => {
                  setInboxOpen(false);
                  enterPreferred();
                }}
              >
                Continue to workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
