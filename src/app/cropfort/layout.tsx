"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CropfortAuthProvider, useCropfortAuth } from "@/components/navigation/auth-context";
import { DeskModeProvider, useDeskMode } from "@/components/cropfort/desk-mode";
import { SpxPlatformShell } from "@/components/cropfort/shells/spx-platform-shell";
import { VendorFieldShell } from "@/components/cropfort/shells/vendor-field-shell";
import { SilvaApprovalShell } from "@/components/cropfort/shells/silva-approval-shell";
import {
  needsWorkspaceSelection,
  SELECT_WORKSPACE_PATH,
} from "@/lib/workspace-gate";

function WorkspaceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeProgram, programs } = useCropfortAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mustPick =
      needsWorkspaceSelection() || (!activeProgram?.id && programs.length > 0);

    if (mustPick) {
      router.replace(SELECT_WORKSPACE_PATH);
      return;
    }
    setReady(true);
  }, [activeProgram?.id, programs.length, pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        Opening workspace…
      </div>
    );
  }

  return <>{children}</>;
}

function DeskShellRouter({ children }: { children: ReactNode }) {
  const desk = useDeskMode();
  if (desk === "vendor") return <VendorFieldShell>{children}</VendorFieldShell>;
  if (desk === "silva") return <SilvaApprovalShell>{children}</SilvaApprovalShell>;
  return <SpxPlatformShell>{children}</SpxPlatformShell>;
}

function CropfortDeskRoot({ children }: { children: ReactNode }) {
  const { user } = useCropfortAuth();
  return (
    <DeskModeProvider role={user.role}>
      <DeskShellRouter>{children}</DeskShellRouter>
    </DeskModeProvider>
  );
}

export default function CropfortLayout({ children }: { children: ReactNode }) {
  return (
    <CropfortAuthProvider>
      <WorkspaceGate>
        <CropfortDeskRoot>{children}</CropfortDeskRoot>
      </WorkspaceGate>
    </CropfortAuthProvider>
  );
}
