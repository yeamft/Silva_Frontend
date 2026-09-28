"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Legacy /cropfort/afp → programme plans register. */
export default function LegacyAfpRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(CROPFORT_ROUTES.programmePlans);
  }, [router]);
  return (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Opening Programme Plans…</p>
    </div>
  );
}
