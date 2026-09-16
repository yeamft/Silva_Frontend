"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { PageContainer, PageHeader } from "@/components/cropfort/page-shell";
import { getNavItemsForRole } from "@/config/navigation";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useCropfortAuth();
  const firstName = user.name.split(" ")[0];
  const modules = getNavItemsForRole(user.role).filter((item) => item.id !== "dashboard");

  const links = modules.flatMap((item) => {
    if (item.children?.length) {
      return item.children.map((child) => ({
        id: child.id,
        label: child.label,
        href: child.href,
        icon: item.icon,
        group: item.label,
      }));
    }
    return [
      {
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        group: null as string | null,
      },
    ];
  });

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${firstName} · ${CROPFORT_ROLE_LABELS[user.role]}`}
      />

      {links.length > 0 ? (
        <section aria-label="Modules" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "cf-focus group flex items-center gap-3 rounded-lg border border-border/80 bg-card px-4 py-3.5",
                  "shadow-[0_1px_2px_rgba(15,23,20,0.08),0_6px_16px_-4px_rgba(15,23,20,0.12),0_16px_32px_-10px_rgba(15,23,20,0.14)]",
                  "transition-[colors,box-shadow,transform] hover:-translate-y-0.5 hover:border-border hover:bg-muted/40",
                  "hover:shadow-[0_2px_8px_rgba(15,23,20,0.1),0_12px_28px_-8px_rgba(15,23,20,0.18)]"
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {item.group ? `${item.group} · ${item.label}` : item.label}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            );
          })}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No modules available for this role yet.</p>
      )}
    </PageContainer>
  );
}
