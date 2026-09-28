"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Legacy catalog path — redirected to plan-based Resources & Capacity. */
export default function LaborWorkforceView() {
  const router = useRouter();
  useEffect(() => {
    router.replace(CROPFORT_ROUTES.laborWorkforce);
  }, [router]);
  return null;
}
