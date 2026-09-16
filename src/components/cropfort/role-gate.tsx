"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { EmptyState, PageContainer } from "@/components/cropfort/page-shell";
import { CROPFORT_ROUTES } from "@/config/navigation";
import type { CropfortRole } from "@/types/cropfort";
import { Button } from "@/components/ui/button";

/**
 * Client-side gate only — this hides UI, it does not authorize anything.
 * The real check must run server-side (route handler + RLS) once the backend
 * lands; see lib/mock-api/client.ts for where that boundary sits.
 */
export function RoleGate({
  allow,
  children,
  readOnlyFor = [],
}: {
  allow: CropfortRole[];
  children: ReactNode | ((ctx: { readOnly: boolean; role: CropfortRole }) => ReactNode);
  /** Roles that may view but not mutate. Must also appear in `allow`. */
  readOnlyFor?: CropfortRole[];
}) {
  const { user } = useCropfortAuth();

  if (!allow.includes(user.role)) return <NotAuthorized />;

  const readOnly = readOnlyFor.includes(user.role);
  return <>{typeof children === "function" ? children({ readOnly, role: user.role }) : children}</>;
}

export function NotAuthorized() {
  return (
    <PageContainer>
      <EmptyState
        icon={ShieldAlert}
        title="No access"
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={CROPFORT_ROUTES.dashboard}>Back to dashboard</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}

/** Hook form of the gate, for pages that need the flag rather than a wrapper. */
export function useRoleAccess(allow: CropfortRole[], readOnlyFor: CropfortRole[] = []) {
  const { user } = useCropfortAuth();
  return {
    role: user.role,
    allowed: allow.includes(user.role),
    readOnly: readOnlyFor.includes(user.role),
  };
}
