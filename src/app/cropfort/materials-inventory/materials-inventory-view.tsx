"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Retired catalog — capacity planning lives under Resources. */
export default function MaterialsInventoryView() {
  const router = useRouter();
  useEffect(() => {
    router.replace(CROPFORT_ROUTES.laborWorkforce);
  }, [router]);
  return null;
}
