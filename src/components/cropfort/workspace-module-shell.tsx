"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import { EmptyState, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";

type WorkspaceModuleShellProps = {
  workspace: string;
  title: string;
  description?: string;
  continueHref?: string;
  continueLabel?: string;
};

/** Lightweight shell for IA modules not yet fully built. */
export function WorkspaceModuleShell({
  workspace,
  title,
  continueHref,
  continueLabel = "Continue",
}: WorkspaceModuleShellProps) {
  return (
    <PageContainer>
      <PageHeader
        eyebrow={workspace}
        title={title}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: workspace },
          { label: title },
        ]}
      />
      <SectionCard>
        <EmptyState
          icon={Construction}
          title={`${title} is coming soon`}
          action={
            continueHref ? (
              <Button asChild>
                <Link href={continueHref}>{continueLabel}</Link>
              </Button>
            ) : undefined
          }
        />
      </SectionCard>
    </PageContainer>
  );
}
