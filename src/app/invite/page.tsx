import { Suspense } from "react";
import InviteAcceptPage from "@/views/InviteAcceptPage";

function InviteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-40 w-full max-w-sm animate-pulse rounded-lg border bg-card" aria-label="Loading" />
    </div>
  );
}

export default function InviteRoute() {
  return (
    <Suspense fallback={<InviteFallback />}>
      <InviteAcceptPage />
    </Suspense>
  );
}
