"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
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
  planWorkspaceEntry,
  WORKSPACE_HOME_PATH,
} from "@/lib/workspace-gate";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { cn } from "@/lib/utils";
import type { AuthProgram } from "@/lib/api/types";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  CheckSquare,
  ChevronDown,
  ClipboardCheck,
  Layers3,
  Loader2,
  LogOut,
  Search,
  Settings,
  Sprout,
} from "lucide-react";

const ease = [0.16, 1, 0.36, 1] as const;

type Filter = "recent" | "all";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function canSeeAdministration(role: string) {
  return (
    role === "system_admin" ||
    role === "spx_platform_admin" ||
    role === "spx_principal" ||
    role.includes("platform_admin")
  );
}

function canSeeCrossApprovals(role: string) {
  return (
    canSeeAdministration(role) ||
    role.includes("spx") ||
    role.includes("silva") ||
    role === "farm_owner"
  );
}

function WorkspaceCard({
  program,
  busy,
  disabled,
  pinned,
  attentionCount,
  lastOpenedLabel,
  onOpen,
  onTogglePin,
}: {
  program: AuthProgram;
  busy: boolean;
  disabled: boolean;
  pinned: boolean;
  attentionCount: number;
  lastOpenedLabel: string | null;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card",
        "transition-colors hover:border-foreground/20",
        disabled && !busy && "opacity-55",
      )}
    >
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
          {initials(program.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold tracking-tight">{program.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {program.roleInProgram || "Member"}
            <span className="mx-1.5 text-border">·</span>
            <StatusBadge status={program.status || "active"} />
          </p>
        </div>
        {/* dfd */}
        <button
          type="button"
          aria-label={pinned ? `Unpin ${program.name}` : `Pin ${program.name}`}
          aria-pressed={pinned}
          disabled={disabled}
          onClick={onTogglePin}
          className={cn(
            "text-[11px] font-medium text-muted-foreground hover:text-foreground",
            pinned && "text-primary",
          )}
        >
          {pinned ? "Pinned" : "Pin"}
        </button>
      </div>

      <div className="mt-3 space-y-1 px-4 pb-3 text-xs text-muted-foreground">
        {attentionCount > 0 ? (
          <p className="font-medium text-foreground">
            {attentionCount} item{attentionCount === 1 ? "" : "s"} need
            {attentionCount === 1 ? "s" : ""} attention
          </p>
        ) : null}
        <p>{lastOpenedLabel ? `Last opened ${lastOpenedLabel}` : "Not opened yet"}</p>
      </div>

      <div className="border-t border-border px-4 py-3">
        <Button
          size="sm"
          className="w-full justify-between"
          disabled={disabled}
          onClick={onOpen}
        >
          {busy ? (
            <>
              Opening…
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </>
          ) : (
            <>
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </article>
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">
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
  const [filter, setFilter] = useState<Filter>("all");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [prefs, setPrefs] = useState<WorkspacePreferences>({
    pinnedProgramIds: [],
    lastOpenedAtByProgramId: {},
  });

  const userId = user?.id || me?.user?.id || "anon";
  const programs = useMemo(
    () =>
      (me?.programs ?? []).filter(
        (p) => String(p.status || "").toLowerCase() !== "archived",
      ),
    [me?.programs],
  );
  const userName = user?.name || user?.email || "Account";
  const userRole = user?.role || me?.user?.role || "";
  const activeId = me?.activeProgram?.id;
  const homeProgramId = preferredProgramId(programs, activeId);
  const showAdmin = canSeeAdministration(userRole);
  const showApprovals = canSeeCrossApprovals(userRole);

  useEffect(() => {
    if (!isHydrated) return;
    setPrefs(loadWorkspacePreferences(userId));
  }, [isHydrated, userId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = sortProgramsByPreference(programs, prefs);

    if (filter === "recent") {
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

    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.roleInProgram || "").toLowerCase().includes(q),
    );
  }, [programs, query, filter, activeId, prefs]);

  const enter = useCallback(
    async (programId: string, deepLink?: string) => {
      if (pickingId) return;
      setPickingId(programId);
      const result = await switchProgram(programId);
      if (result.ok === false) {
        setPickingId(null);
        const message =
          "error" in result ? result.error : "Could not open workspace — try again";
        toast.error(message || "Could not open workspace — try again");
        return;
      }
      const nextPrefs = markProgramOpened(userId, programId);
      setPrefs(nextPrefs);
      clearWorkspaceSelectionRequired();
      const name = programs.find((p) => p.id === programId)?.name;
      toast.success(name ? `Opened ${name}` : "Workspace ready");
      router.replace(deepLink || WORKSPACE_HOME_PATH);
    },
    [pickingId, programs, router, switchProgram, userId],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isHydrated, isAuthenticated, router]);

  // Asset owner / vendor with a single workspace: enter it and skip this screen.
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || pickingId) return;
    const plan = planWorkspaceEntry({
      role: userRole,
      programs,
      activeProgramId: activeId,
    });
    if (plan.action === "home") {
      clearWorkspaceSelectionRequired();
      router.replace(WORKSPACE_HOME_PATH);
      return;
    }
    if (plan.action === "auto") {
      void enter(plan.programId);
    }
  }, [
    isHydrated,
    isAuthenticated,
    userRole,
    programs,
    activeId,
    pickingId,
    router,
    enter,
  ]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  const singleDeskAuto =
    planWorkspaceEntry({
      role: userRole,
      programs,
      activeProgramId: activeId,
    }).action !== "pick";

  if (singleDeskAuto || pickingId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Opening workspace…
      </div>
    );
  }

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
    toast.success(
      next.pinnedProgramIds.includes(programId) ? "Pinned workspace" : "Unpinned workspace",
    );
  };

  const signOut = async () => {
    clearWorkspaceSelectionRequired();
    await logout();
    router.replace("/login");
  };

  const cardAttention = (programId: string) =>
    programId === homeProgramId ? attentionCount : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sprout className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Cropfort</p>
              <p className="truncate text-[11px] text-muted-foreground">Workspaces</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="relative h-9 w-9"
              onClick={() => setInboxOpen(true)}
              aria-label="Inbox"
            >
              <Bell className="h-4 w-4" />
              {attentionCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning" />
              ) : null}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {initials(userName)}
                  </span>
                  <span className="hidden max-w-[8rem] truncate text-xs sm:inline">{userName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userRole || "Signed in"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {showAdmin ? (
                  <DropdownMenuItem
                    disabled={!homeProgramId || !!pickingId}
                    onClick={() => enterPreferred(CROPFORT_ROUTES.users)}
                  >
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    Administration
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:gap-10">
        <aside className="hidden w-44 shrink-0 flex-col gap-1 lg:flex">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Platform
          </p>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 text-sm font-medium"
          >
            <Layers3 className="h-4 w-4" />
            Workspaces
          </button>
          <button
            type="button"
            onClick={() => setInboxOpen(true)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            Inbox
            {attentionCount > 0 ? (
              <span className="ml-auto rounded-md bg-foreground px-1.5 text-[10px] font-semibold text-background">
                {attentionCount}
              </span>
            ) : null}
          </button>
          {showApprovals ? (
            <button
              type="button"
              disabled={!homeProgramId || !!pickingId}
              onClick={() => enterPreferred(CROPFORT_ROUTES.approvals)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
            >
              <ClipboardCheck className="h-4 w-4" />
              Approvals
            </button>
          ) : null}
          {showAdmin ? (
            <button
              type="button"
              disabled={!homeProgramId || !!pickingId}
              onClick={() => enterPreferred(CROPFORT_ROUTES.users)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
            >
              <Settings className="h-4 w-4" />
              Administration
            </button>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-6"
          >
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Your workspaces</h1>
              
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workspaces…"
                  className="h-10 pl-9"
                  aria-label="Search workspaces"
                />
              </div>
              <div className="flex gap-1 rounded-lg border border-border p-0.5">
                <Button
                  size="sm"
                  variant={filter === "recent" ? "secondary" : "ghost"}
                  className="h-8"
                  onClick={() => setFilter("recent")}
                >
                  Recent
                </Button>
                <Button
                  size="sm"
                  variant={filter === "all" ? "secondary" : "ghost"}
                  className="h-8"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
              </div>
            </div>

            <div className="flex gap-2 lg:hidden">
              <Button size="sm" variant="outline" onClick={() => setInboxOpen(true)}>
                Inbox
                {attentionCount > 0 ? ` (${attentionCount})` : ""}
              </Button>
              {showApprovals ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!homeProgramId || !!pickingId}
                  onClick={() => enterPreferred(CROPFORT_ROUTES.approvals)}
                >
                  Approvals
                </Button>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
                <Layers3 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm font-medium">
                  {programs.length === 0 ? "No workspaces assigned" : "No matches"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {programs.length === 0
                    ? "Ask your administrator to add you to a programme."
                    : "Try a different search."}
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {visible.map((program, i) => (
                  <motion.li
                    key={program.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.03 * i, ease }}
                  >
                    <WorkspaceCard
                      program={program}
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
              Inbox
              {attentionCount > 0 ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                  {attentionCount}
                </span>
              ) : null}
            </SheetTitle>
            <SheetDescription>
              Cross-workspace items needing attention. Opening one enters your workspace.
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
