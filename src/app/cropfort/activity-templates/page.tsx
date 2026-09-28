"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Legacy stub — use Activity Taxonomy. */
export default function ActivityTemplatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(CROPFORT_ROUTES.activityTaxonomy);
  }, [router]);
  return null;
}
