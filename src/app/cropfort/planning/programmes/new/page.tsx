"use client";

import dynamic from "next/dynamic";

const View = dynamic(() => import("../../../afp/core-operations-view"), {
  ssr: false,
  loading: () => (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  ),
});

/** New Core Operations plan: the editor opens on its Details step and creates the plan from there. */
export default function NewProgrammePlanPage() {
  return <View isNew />;
}
