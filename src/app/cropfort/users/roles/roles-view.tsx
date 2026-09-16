"use client";

import { useMemo, useState } from "react";
import { Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canManageUsers } from "@/lib/cropfortAccess";
import { CROPFORT_ROLE_LABELS, type CropfortRole } from "@/types/cropfort";

type CustomRole = {
  id: string;
  key: string;
  label: string;
};

const SYSTEM_ROLES = (Object.keys(CROPFORT_ROLE_LABELS) as CropfortRole[]).map((key) => ({
  id: key,
  key,
  label: CROPFORT_ROLE_LABELS[key],
  system: true as const,
}));

export default function RolesConfigPage() {
  const { user } = useCropfortAuth();
  const allowed = canManageUsers(user.role);

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");

  const rows = useMemo(
    () => [...SYSTEM_ROLES, ...customRoles.map((r) => ({ ...r, system: false as const }))],
    [customRoles]
  );

  if (!allowed) {
    return <NotAuthorized title="Roles" />;
  }

  function addRole() {
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmedLabel || !trimmedKey) {
      toast.error("Enter a role key and label");
      return;
    }
    if (rows.some((r) => r.key === trimmedKey)) {
      toast.error("A role with that key already exists");
      return;
    }
    setCustomRoles((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, key: trimmedKey, label: trimmedLabel },
    ]);
    setLabel("");
    setKey("");
    toast.success("Role added");
  }

  return (
    <PageContainer>
      <PageHeader title="Roles" />

      <SectionCard title="Create role">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <FormField
            label="Role key"
            required
            render={(props) => (
              <Input
                {...props}
                placeholder="e.g. field_auditor"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            )}
          />
          <FormField
            label="Display name"
            required
            render={(props) => (
              <Input
                {...props}
                placeholder="e.g. Field Auditor"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
              />
            )}
          />
          <Button type="button" className="gap-1.5" onClick={addRole}>
            <Plus className="h-4 w-4" aria-hidden />
            Add role
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Role catalogue">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Shield className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm text-muted-foreground">No roles configured.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((role) => (
              <li key={role.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{role.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{role.key}</p>
                </div>
                <Badge variant={role.system ? "secondary" : "outline"}>
                  {role.system ? "System" : "Custom"}
                </Badge>
                {!role.system ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setCustomRoles((prev) => prev.filter((r) => r.id !== role.id));
                      toast.success("Role removed");
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
