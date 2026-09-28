"use client";

import Link from "next/link";
import { Bell, Check, KeyRound, Languages, MonitorSmartphone, Moon, Save, ShieldCheck, Sun, Type } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import { useThemeStore } from "@/store/themeStore";
import { WORKSPACE_COLORS } from "@/lib/workspace-themes";
import { WORKSPACE_FONTS } from "@/lib/workspace-fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useCropfortAuth();
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const workspaceColor = useThemeStore((s) => s.workspaceColor);
  const setWorkspaceColor = useThemeStore((s) => s.setWorkspaceColor);
  const workspaceFont = useThemeStore((s) => s.workspaceFont);
  const setWorkspaceFont = useThemeStore((s) => s.setWorkspaceFont);

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
            <div className="space-y-5">
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

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Workspace color</span>
                  <span className="text-xs text-muted-foreground">
                    {WORKSPACE_COLORS.find((c) => c.id === workspaceColor)?.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WORKSPACE_COLORS.map((color) => {
                    const selected = color.id === workspaceColor;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setWorkspaceColor(color.id)}
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary bg-accent text-accent-foreground"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                        aria-pressed={selected}
                        title={color.description}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: dark ? color.dark.swatch : color.light.swatch,
                          }}
                          aria-hidden
                        />
                        {color.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {WORKSPACE_COLORS.find((c) => c.id === workspaceColor)?.description ??
                    "Changes primary actions, navigation, and the workspace background."}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm">
                    <Type className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Font
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {WORKSPACE_FONTS.find((f) => f.id === workspaceFont)?.label}
                  </span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {WORKSPACE_FONTS.map((font) => {
                    const selected = font.id === workspaceFont;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setWorkspaceFont(font.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "border-primary/40 bg-accent text-accent-foreground"
                            : "border-border text-foreground hover:bg-muted",
                        )}
                        aria-pressed={selected}
                        title={font.description}
                      >
                        <span className="min-w-0">
                          <span
                            className="block truncate text-sm font-medium leading-tight"
                            style={{ fontFamily: `var(${font.cssVar})` }}
                          >
                            {font.label}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {font.description}
                          </span>
                        </span>
                        {selected ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
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
