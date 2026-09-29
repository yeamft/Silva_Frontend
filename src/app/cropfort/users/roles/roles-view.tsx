"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shield, Users } from "lucide-react";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canManageUsers } from "@/lib/cropfortAccess";
import { useUsers } from "@/lib/query";
import { CROPFORT_ROLE_LABELS, type CropfortRole } from "@/types/cropfort";

const ROLE_CAPS: Record<
  CropfortRole,
  { desk: string; can: string[]; cannot: string[] }
> = {
  spx_platform_admin: {
    desk: "SPX · Platform",
    can: [
      "Users & org map",
      "Programs & spend bands",
      "Full WO / AFE / rates",
      "Authorize settlements",
      "Release reports",
    ],
    cannot: ["Act as Silva approver for rates (use farm_owner)"],
  },
  spx_validator: {
    desk: "SPX · Operations",
    can: [
      "Plans / AFE / WO issue",
      "Validate tickets",
      "Verify payment requests",
      "Propose rate cards",
      "Authorize settlements",
    ],
    cannot: ["Approve rate cards as asset owner", "Mark owner settlements settled"],
  },
  farm_owner: {
    desk: "Silva · Asset owner",
    can: [
      "Decide AFP / AFE",
      "Approve / return rate cards",
      "Mark settlements settled",
      "Read released reports",
      "Estate map (read)",
    ],
    cannot: ["Create plans / issue WOs", "See raw payment requests or draft tickets"],
  },
  bagro_office: {
    desk: "Vendor · Office",
    can: ["Create / submit tickets", "Create payment requests", "Read assigned WOs"],
    cannot: ["Validate tickets", "Approve AFEs", "See Silva settlements"],
  },
  field_supervisor: {
    desk: "Vendor · Field",
    can: ["Field tickets", "Site review", "Assigned WOs"],
    cannot: ["Commercial PR authorize", "Rate card approve"],
  },
};

const SYSTEM_ROLES = Object.keys(CROPFORT_ROLE_LABELS) as CropfortRole[];

export default function RolesConfigPage() {
  const { user } = useCropfortAuth();
  const allowed = canManageUsers(user.role);
  const usersQuery = useUsers(allowed);
  const users = usersQuery.data ?? [];
  const [focus, setFocus] = useState<CropfortRole | null>(null);

  const counts = useMemo(() => {
    const map = Object.fromEntries(SYSTEM_ROLES.map((r) => [r, 0])) as Record<CropfortRole, number>;
    for (const u of users) {
      for (const r of u.roles || []) {
        if (r in map) map[r as CropfortRole] += 1;
      }
    }
    return map;
  }, [users]);

  if (!allowed) {
    return <NotAuthorized title="Roles" />;
  }

  const selected = focus ? ROLE_CAPS[focus] : null;

  return (
    <PageContainer>
      <PageHeader
        title="Roles"
        description="System Cropfort desks. Assign roles to people on Users — this page is the catalogue and matrix."
        actions={
          <Button size="sm" asChild>
            <Link href={CROPFORT_ROUTES.users}>
              <Users className="h-4 w-4" />
              Assign on Users
            </Link>
          </Button>
        }
      />

      <SectionCard title="Role catalogue" description="Click a role to see capabilities and assignee count">
        <ul className="divide-y rounded-lg border">
          {SYSTEM_ROLES.map((role) => (
            <li key={role}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-secondary/40 ${
                  focus === role ? "bg-accent/40" : ""
                }`}
                onClick={() => setFocus(focus === role ? null : role)}
              >
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{CROPFORT_ROLE_LABELS[role]}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_CAPS[role].desk} · {role}
                  </p>
                </div>
                <Badge variant="secondary">{counts[role]} users</Badge>
                <Badge variant="outline">System</Badge>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      {selected && focus ? (
        <SectionCard
          title={CROPFORT_ROLE_LABELS[focus]}
          description={selected.desk}
          actions={
            <Button size="sm" variant="outline" asChild>
              <Link href={CROPFORT_ROUTES.users}>Edit assignees</Link>
            </Button>
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Can
              </p>
              <ul className="space-y-1.5 text-sm">
                {selected.can.map((item) => (
                  <li key={item} className="text-foreground">
                    · {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cannot
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {selected.cannot.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Tenancy snapshot" description="Critical chain gates by desk">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>SPX</TableHead>
                <TableHead>Silva</TableHead>
                <TableHead>Vendor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Plan / AFE create", "Yes", "—", "—"],
                ["Plan / AFE decide", "—", "Yes", "—"],
                ["WO issue", "Yes + Sch.4", "—", "—"],
                ["Ticket validate", "Yes", "—", "—"],
                ["PR create", "Yes", "—", "Yes"],
                ["PR verify / settle auth", "Yes", "—", "—"],
                ["Settlement mark settled", "—", "Yes", "—"],
                ["Raw PR list", "Yes", "Blocked", "Yes"],
                ["Rate approve", "—", "Yes", "—"],
              ].map(([action, spx, silva, vendor]) => (
                <TableRow key={action}>
                  <TableCell className="font-medium">{action}</TableCell>
                  <TableCell className="text-sm">{spx}</TableCell>
                  <TableCell className="text-sm">{silva}</TableCell>
                  <TableCell className="text-sm">{vendor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Full matrix: <code className="text-xs">docs/TENANCY_ROLE_MATRIX.md</code>. Assign or change
          roles on{" "}
          <Link href={CROPFORT_ROUTES.users} className="text-primary underline-offset-2 hover:underline">
            Users
          </Link>
          .
        </p>
      </SectionCard>
    </PageContainer>
  );
}
