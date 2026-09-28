"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, LogOut, Menu, Search, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { useAuthStore } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { useOrgStore } from "@/store/orgStore";
import { useFieldOsStore } from "@/store/fieldOsStore";
import { t } from "@/lib/translations";
import { ROLE_LABELS } from "@/lib/rbac";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TopBarProps {
  title: string;
  onNavigate?: (view: string) => void;
  onOpenMenu?: () => void;
}

const TopBar = ({ title, onNavigate, onOpenMenu }: TopBarProps) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();

  const orgId = useOrgStore((s) => s.currentOrganizationId);
  const branchId = useOrgStore((s) => s.currentBranchId);
  const branches = useOrgStore((s) => s.branches);
  const setCurrentBranch = useOrgStore((s) => s.setCurrentBranch);

  const program = useFieldOsStore((s) => s.program);
  const afes = useFieldOsStore((s) => s.afes);
  const workOrders = useFieldOsStore((s) => s.workOrders);

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const currentBranch = branches.find((b) => b.id === branchId);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [] as { id: string; title: string; subtitle: string; view: string }[];
    const afeHits = afes
      .filter((a) => a.title.toLowerCase().includes(q) || a.band.toLowerCase().includes(q))
      .map((a) => ({
        id: a.id,
        title: a.title,
        subtitle: `AFE · Band ${a.band} · ${a.status}`,
        view: "dashboard",
      }));
    const woHits = workOrders
      .filter((w) => w.title.toLowerCase().includes(q))
      .map((w) => ({
        id: w.id,
        title: w.title,
        subtitle: `WO · ${w.status}`,
        view: "dashboard",
      }));
    return [...afeHits, ...woHits].slice(0, 8);
  }, [query, afes, workOrders]);

  const handleLogout = () => {
    setOpen(false);
    void logout();
    router.replace("/login");
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-background px-3 shadow-[0_1px_2px_rgba(15,23,20,0.06),0_4px_16px_-6px_rgba(15,23,20,0.12)] sm:gap-3 sm:px-6"
      style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMenu && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="shrink-0 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{program.code}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="max-w-[9.5rem] gap-1.5 sm:max-w-none">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate font-normal">{currentBranch?.name ?? program.code}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Active unit</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {branches
              .filter((b) => b.active && b.organizationId === orgId)
              .map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => setCurrentBranch(b.id)} className="cursor-pointer">
                  <div className="flex flex-col">
                    <span className={b.id === branchId ? "font-medium text-primary" : ""}>{b.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {b.code}
                      {b.isWarehouse ? " · Store" : " · Field unit"}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            {branches.filter((b) => b.active && b.organizationId === orgId).length === 0 && (
              <DropdownMenuItem disabled>{program.name}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {user && (
          <div className="mr-1 hidden flex-col items-end lg:flex">
            <span className="text-sm font-medium text-foreground">{user.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
        )}

        <ThemeToggle />

        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search className="h-4 w-4" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search AFEs or work orders…"
              className="h-9"
            />
            <div className="mt-2 space-y-1">
              {searchResults.map((m) => (
                <Button
                  key={m.id}
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-1.5 text-left"
                  onClick={() => {
                    onNavigate?.(m.view);
                    setSearchOpen(false);
                    setQuery("");
                  }}
                >
                  <div>
                    <p className="text-xs font-medium">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{m.subtitle}</p>
                  </div>
                </Button>
              ))}
              {query.length >= 2 && searchResults.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">No matches found.</p>
              )}
              {query.length < 2 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">Type at least two characters.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <NotificationBell />

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1.5 px-2" aria-label="Account menu">
              <User className="h-4 w-4 shrink-0" aria-hidden />
              <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user && (
              <>
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                    <span className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                      {program.name}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t(locale, "logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
