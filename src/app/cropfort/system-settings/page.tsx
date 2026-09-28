"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";

const LINKS = [
  {
    title: "Programs",
    href: CROPFORT_ROUTES.programs,
    detail: "Workspace programmes and membership",
  },
  {
    title: "Spend bands",
    href: CROPFORT_ROUTES.spendBands,
    detail: "A–D ETB authority caps (Schedule 3)",
  },
  {
    title: "Agreement lifecycle",
    href: CROPFORT_ROUTES.agreementLifecycle,
    detail: "Schedules 5–9, establishment, six-month reviews",
  },
  {
    title: "Farm map / blocks",
    href: CROPFORT_ROUTES.farmMap,
    detail: "Org map estates and blocks",
  },
  {
    title: "Users & roles",
    href: CROPFORT_ROUTES.users,
    detail: "Assign system Cropfort roles",
  },
];

export default function SystemSettingsPage() {
  const { activeProgram } = useCropfortAuth();

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Administration"}
        title="System configuration"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "System configuration" },
        ]}
      />

      <SectionCard title="Workspace settings" description="Jump to live configuration desks">
        <ul className="divide-y rounded-lg border">
          {LINKS.map((item) => (
            <li key={item.href} className="flex items-center gap-3 px-4 py-3">
              <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={item.href}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
