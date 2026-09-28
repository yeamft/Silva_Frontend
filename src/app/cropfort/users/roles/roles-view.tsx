"use client";

import { Shield } from "lucide-react";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
import { canManageUsers } from "@/lib/cropfortAccess";
import { CROPFORT_ROLE_LABELS, type CropfortRole } from "@/types/cropfort";

const SYSTEM_ROLES = (Object.keys(CROPFORT_ROLE_LABELS) as CropfortRole[]).map((key) => ({
  id: key,
  key,
  label: CROPFORT_ROLE_LABELS[key],
}));

export default function RolesConfigPage() {
  const { user } = useCropfortAuth();
  const allowed = canManageUsers(user.role);

  if (!allowed) {
    return <NotAuthorized title="Roles" />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        description="System Cropfort roles. Assign them on Users custom roles are not supported yet."
      />

      <SectionCard title="Role catalogue">
        <ul className="divide-y rounded-lg border">
          {SYSTEM_ROLES.map((role) => (
            <li key={role.id} className="flex items-center gap-3 px-4 py-3">
              <Shield className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{role.label}</p>
                <p className="truncate text-xs text-muted-foreground">{role.key}</p>
              </div>
              <Badge variant="secondary">System</Badge>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
