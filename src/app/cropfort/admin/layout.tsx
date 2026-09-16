"use client";

import type { ReactNode } from "react";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { canViewOrgMap } from "@/lib/cropfortAccess";

export default function AdminOrgLayout({ children }: { children: ReactNode }) {
  const { user } = useCropfortAuth();

  if (!canViewOrgMap(user.role)) {
    return <NotAuthorized title="Farm map" />;
  }

  return children;
}
