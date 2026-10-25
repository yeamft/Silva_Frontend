"use client";

import dynamic from "next/dynamic";

const View = dynamic(() => import("./farm-assessments-view"), {
  ssr: false,
  loading: () => (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Loading farm assessments…</p>
    </div>
  ),
});

export default function FarmAssessmentsPage() {
  return <View />;
}
