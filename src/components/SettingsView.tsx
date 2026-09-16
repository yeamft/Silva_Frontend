"use client";

import { useState } from "react";
import {
  Building2,
  Shield,
  Palette,
  Bell,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Lock,
} from "lucide-react";
import { useFieldOsStore } from "@/store/fieldOsStore";
import { ROLE_LABELS } from "@/lib/rbac";
import { useThemeStore } from "@/store/themeStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DESK_MATRIX = [ 
  {
    role: "silva_owner" as const,
    afp: true,
    afe: true,
    wo: true,
    ft: false,
    pr: false,
    settle: true,
    revenue: false,
  },
  {
    role: "spx_principal" as const,
    afp: true,
    afe: true,
    wo: true,
    ft: true,
    pr: true,
    settle: true,
    revenue: true,
  },
  {
    role: "vendor_lead" as const,
    afp: false,
    afe: true,
    wo: true,
    ft: true,
    pr: true,
    settle: false,
    revenue: false,
  },
];

function ProgramTab() {
  const program = useFieldOsStore((s) => s.program);
  const orgs = useFieldOsStore((s) => s.organizations);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {program.estateName} · {program.code} · {program.hectares} ha
          </p>
          <div className="flex flex-wrap gap-2">
            {orgs
              .filter((o) => program.memberOrgIds.includes(o.id))
              .map((o) => (
                <Badge key={o.id} variant="secondary">
                  {o.shortName} · {o.kind}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FirewallsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        {
          title: "Revenue firewall",
          desc: "SPX revenue ledger is principal-only. Never joined into Silva or vendor views.",
        },
        {
          title: "No vendor → Silva channel",
          desc: "Field tickets and payment requests reach Silva only after SPX validation / release.",
        },
        {
          title: "Maker–checker",
          desc: "Submitters cannot validate or approve their own money and workflow steps.",
        },
        {
          title: "Schedule 4 insurance",
          desc: "Work orders cannot issue when assigned vendor insurance is missing or expired.",
        },
      ].map((item) => (
        <Card key={item.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              {item.title}
            </CardTitle>
            <CardDescription>{item.desc}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function AppearanceTab() {
  const dark = useThemeStore((s) => s.dark);
  const setDark = useThemeStore((s) => s.setDark);
  const [saved, setSaved] = useState(false);
  const theme = dark ? "dark" : "light";

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label id="theme-label">Theme</Label>
          <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="theme-label">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = opt.value === "system" ? false : theme === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  className="h-auto flex-col gap-1.5 py-3"
                  onClick={() => {
                    if (opt.value === "light") setDark(false);
                    if (opt.value === "dark") setDark(true);
                    if (opt.value === "system") {
                      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                      setDark(prefersDark);
                    }
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="text-xs">{opt.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          className="gap-1.5"
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Saved
            </>
          ) : (
            "Save appearance"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const [bandB, setBandB] = useState(true);
  const [approvals, setApprovals] = useState(true);
  const [settlements, setSettlements] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { id: "bandB", label: "Band B AFE alerts", checked: bandB, set: setBandB },
          { id: "approvals", label: "Pending owner approvals", checked: approvals, set: setApprovals },
          { id: "settlements", label: "Settlement releases", checked: settlements, set: setSettlements },
        ].map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-3">
            <Label htmlFor={row.id} className="cursor-pointer font-medium">
              {row.label}
            </Label>
            <Switch id={row.id} checked={row.checked} onCheckedChange={row.set} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RolesTab() {
  const modules = [
    { key: "afp", label: "AFP" },
    { key: "afe", label: "AFE" },
    { key: "wo", label: "WO" },
    { key: "ft", label: "Tickets" },
    { key: "pr", label: "Pay req" },
    { key: "settle", label: "Settle" },
    { key: "revenue", label: "Revenue" },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desk access</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Desk</TableHead>
              {modules.map((m) => (
                <TableHead key={m.key} className="text-center">
                  {m.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {DESK_MATRIX.map((row) => (
              <TableRow key={row.role}>
                <TableCell className="font-medium">{ROLE_LABELS[row.role]}</TableCell>
                {modules.map((m) => {
                  const has = row[m.key];
                  return (
                    <TableCell key={m.key} className="text-center">
                      {has ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const SettingsView = () => {
  return (
    <div className="cf-page max-w-[1200px]">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Tabs defaultValue="program">
        <TabsList className="cf-tab-scroll mb-4 h-auto max-w-full flex-nowrap justify-start gap-1 overflow-x-auto p-1">
          <TabsTrigger value="program" className="min-h-10 shrink-0">
            <Building2 className="h-3.5 w-3.5" aria-hidden /> Program
          </TabsTrigger>
          <TabsTrigger value="firewalls" className="min-h-10 shrink-0">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Firewalls
          </TabsTrigger>
          <TabsTrigger value="notifications" className="min-h-10 shrink-0">
            <Bell className="h-3.5 w-3.5" aria-hidden /> Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="min-h-10 shrink-0">
            <Palette className="h-3.5 w-3.5" aria-hidden /> Appearance
          </TabsTrigger>
          <TabsTrigger value="roles" className="min-h-10 shrink-0">
            <Shield className="h-3.5 w-3.5" aria-hidden /> Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="program">
          <ProgramTab />
        </TabsContent>
        <TabsContent value="firewalls">
          <FirewallsTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsView;
