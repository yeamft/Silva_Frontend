"use client";

import type { LucideIcon } from "lucide-react";
import { LayoutGrid, List, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  PageMetaStrip,
  type Crumb,
} from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Odoo-inspired Execution / Control desk chrome.
 * Pattern: header → meta → control panel → list | split | board | form.
 */
export function OpsDeskPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <PageContainer className={cn("cf-ops-desk space-y-5", className)}>{children}</PageContainer>
  );
}

export function OpsDeskHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
  eyebrow = "Workspace",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  meta?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
      breadcrumbs={breadcrumbs}
      meta={meta}
    />
  );
}

export function OpsDeskMeta({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return <PageMetaStrip items={items} />;
}

/**
 * Sticky control panel — Odoo-style: search · filters · view · primary action.
 */
export function OpsDeskControlPanel({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  children,
  view,
  onViewChange,
  views = ["list", "board"],
  trailing,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  children?: ReactNode;
  view?: "list" | "board" | "split";
  onViewChange?: (view: "list" | "board" | "split") => void;
  views?: Array<"list" | "board" | "split">;
  trailing?: ReactNode;
  className?: string;
}) {
  const showViewToggle = Boolean(view && onViewChange && views.length > 1);

  return (
    <div
      className={cn(
        "cf-ops-toolbar flex flex-col gap-3 rounded-lg border border-border bg-card/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {onSearchChange ? (
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8"
              placeholder={searchPlaceholder}
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        {filters}
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {showViewToggle ? (
          <div className="flex rounded-md border border-border p-0.5">
            {views.includes("list") ? (
              <Button
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => onViewChange?.("list")}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {views.includes("board") ? (
              <Button
                size="sm"
                variant={view === "board" ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => onViewChange?.("board")}
                aria-label="Board view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}

/** Alias used by earlier Execution pages. */
export const OpsDeskToolbar = OpsDeskControlPanel;

export function OpsDeskFilterChips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
            {opt.count != null ? (
              <span
                className={cn(
                  "cf-numeric rounded px-1 text-[10px]",
                  active ? "bg-primary-foreground/20" : "bg-background/80",
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Full-width list / table surface. */
export function OpsDeskList({
  children,
  className,
  flush = true,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        "cf-ops-surface overflow-hidden rounded-lg border border-border bg-card",
        !flush && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const OpsDeskSurface = OpsDeskList;

/** Register + detail split (Weekly plans, DFRs, Communications). */
export function OpsDeskSplit({
  register,
  detail,
  registerTitle = "Register",
  registerWidthClass = "lg:w-[17.5rem]",
  className,
}: {
  register: ReactNode;
  detail: ReactNode;
  registerTitle?: string;
  registerWidthClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]", className)}>
      <aside
        className={cn(
          "cf-ops-surface flex min-h-[22rem] flex-col overflow-hidden rounded-lg border border-border bg-card lg:min-h-[28rem]",
          registerWidthClass,
        )}
      >
        <div className="border-b border-border px-3.5 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {registerTitle}
          </p>
        </div>
        <div className="cf-scroll flex-1 overflow-y-auto p-1.5">{register}</div>
      </aside>
      <div className="min-w-0">{detail}</div>
    </div>
  );
}

export function OpsDeskRegisterItem({
  active,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  active?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cf-focus flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-muted/70",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}

export function OpsDeskDetail({
  title,
  description,
  badge,
  actions,
  children,
  className,
  empty,
}: {
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  empty?: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
  };
}) {
  if (empty) {
    return (
      <OpsDeskList
        flush={false}
        className={cn(
          "flex min-h-[22rem] items-center justify-center lg:min-h-[28rem]",
          className,
        )}
      >
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      </OpsDeskList>
    );
  }

  return (
    <OpsDeskList
      flush
      className={cn("flex min-h-[22rem] flex-col lg:min-h-[28rem]", className)}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {title ? (
                <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
              ) : null}
              {badge}
            </div>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="flex-1 p-4 sm:p-5">{children}</div>
    </OpsDeskList>
  );
}

export type OpsDeskChatterEvent = {
  id: string;
  title: string;
  subtitle?: string;
  at?: string;
};

/**
 * Lightweight Odoo-style chatter: status trail + optional note composer.
 */
export function OpsDeskChatter({
  title = "Chatter",
  events,
  note,
  onNoteChange,
  onPost,
  postDisabled,
  postLabel = "Log note",
  emptyLabel = "No activity yet",
  className,
}: {
  title?: string;
  events: OpsDeskChatterEvent[];
  note?: string;
  onNoteChange?: (value: string) => void;
  onPost?: () => void;
  postDisabled?: boolean;
  postLabel?: string;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      </div>
      {onNoteChange && onPost ? (
        <div className="space-y-2 border-b border-border px-4 py-3">
          <Textarea
            rows={2}
            value={note ?? ""}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Write a note…"
            className="min-h-[4rem] resize-none text-sm"
          />
          <Button size="sm" onClick={onPost} disabled={postDisabled || !(note ?? "").trim()}>
            {postLabel}
          </Button>
        </div>
      ) : null}
      {events.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <p className="text-sm font-medium">{e.title}</p>
              {(e.subtitle || e.at) && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[e.subtitle, e.at].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
