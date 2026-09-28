"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Legacy stub — branding lives under Programs / System configuration. */
export default function TenantConfigRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(CROPFORT_ROUTES.systemSettings);
  }, [router]);
  return null;
}
