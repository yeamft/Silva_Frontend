"use client";

import Link from "next/link";
import { Bell, KeyRound, Languages, MonitorSmartphone, Moon, Save, ShieldCheck, Sun } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import { useThemeStore } from "@/store/themeStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const { user } = useCropfortAuth();
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <PageContainer>
      <PageHeader
        title="Profile"
        actions={
          <Button size="sm" className="h-11 w-full gap-1.5 sm:h-9 sm:w-auto">
            <Save className="h-4 w-4" aria-hidden />
            Save
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SectionCard title="Personal details">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground"
                aria-hidden
              >
                {initials}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CROPFORT_ROLE_LABELS[user.role]} · {user.tenantName}
                </p>
                <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">
                  Change photo
                </Button>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input id="profile-name" defaultValue={user.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" defaultValue={user.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-role">Role</Label>
                <Input id="profile-role" value={CROPFORT_ROLE_LABELS[user.role]} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-tenant">Tenant</Label>
                <Input id="profile-tenant" value={user.tenantName} readOnly disabled />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Notifications">
            <ul className="space-y-4">
              {[
                { id: "notif-queue", title: "Validation queue", defaultChecked: true },
                { id: "notif-sla", title: "SLA breaches", defaultChecked: true },
                { id: "notif-digest", title: "Weekly digest", defaultChecked: false },
              ].map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4">
                  <Label htmlFor={item.id} className="text-sm font-medium">
                    {item.title}
                  </Label>
                  <Switch id={item.id} defaultChecked={item.defaultChecked} />
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Security">
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">Two-factor authentication</p>
                  <Badge variant="outline" className="mt-1.5 rounded-md text-[11px]">
                    On
                  </Badge>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <KeyRound className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Password</p>
                  <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">
                    Change password
                  </Button>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <MonitorSmartphone className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Sessions</p>
                  <Button asChild variant="outline" size="sm" className="mt-2 h-8 text-xs">
                    <Link href={CROPFORT_ROUTES.sessions}>Manage sessions</Link>
                  </Button>
                </div>
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="Preferences">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {dark ? (
                    <Moon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <Sun className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                  <span className="text-sm">Dark mode</span>
                </div>
                <Switch
                  id="pref-theme"
                  checked={dark}
                  onCheckedChange={() => toggleTheme()}
                  aria-label="Toggle dark mode"
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Languages className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm">Language</span>
                </div>
                <Badge variant="secondary" className="rounded-md">
                  English
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm">Desktop alerts</span>
                </div>
                <Switch id="pref-desktop" defaultChecked />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
