"use client";

import dynamic from "next/dynamic";

const View = dynamic(() => import("./annual-budget-view"), {
  ssr: false,
  loading: () => <div className="cf-page"><p className="text-sm text-muted-foreground">Loading annual budget…</p></div>,
});

export default function AnnualBudgetPage() {
  return <View />;
}