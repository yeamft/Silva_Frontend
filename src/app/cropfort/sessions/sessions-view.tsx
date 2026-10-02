"use client";

import { useState } from "react";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SessionsPage() {
  const { sessions, logout, revokeSession, refreshSessions } = useCropfortAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <PageContainer>
      <PageHeader
        title="Sessions"
        actions={
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={logout}>
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </Button>
        }
      />

      <SectionCard flush>
        <ul className="divide-y divide-border/60">
          {sessions.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">No active sessions.</li>
          ) : (
            sessions.map((session) => (
              <li key={session.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <MonitorSmartphone className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{session.device}</p>
                    {session.current ? <Badge variant="success">This device</Badge> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.location} · last active {new Date(session.lastActiveAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={session.current || busyId === session.id}
                  onClick={async () => {
                    setBusyId(session.id);
                    try {
                      await revokeSession(session.id);
                      await refreshSessions();
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {session.current ? "This device" : busyId === session.id ? "Revoking…" : "Revoke"}
                </Button>
              </li>
            ))
          )}
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
