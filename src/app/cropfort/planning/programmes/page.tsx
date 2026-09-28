"use client";

import dynamic from "next/dynamic";

const View = dynamic(() => import("./programme-plans-register-view"), {
  ssr: false,
  loading: () => (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Loading programme plans…</p>
    </div>
  ),
});

export default function ProgrammePlansPage() {
  return <View />;
}
