"use client";

import dynamic from "next/dynamic";

const View = dynamic(() => import("./core-operations-view"), {
  ssr: false,
  loading: () => (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Loading Core Operations…</p>
    </div>
  ),
});

export default function CoreOperationsPage() {
  return <View />;
}
