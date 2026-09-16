"use client";

import { ShieldOff } from "lucide-react";
import { EmptyState, PageContainer } from "@/components/cropfort/page-shell";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function NotAuthorized({ title = "No access" }: { title?: string }) {
  return (
    <PageContainer>
      <EmptyState
        icon={ShieldOff}
        title={title}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={CROPFORT_ROUTES.dashboard}>Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
