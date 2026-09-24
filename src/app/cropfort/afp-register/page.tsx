"use client";

import dynamic from "next/dynamic";

const View = dynamic(() => import("./afp-register-view"), {
  ssr: false,
  loading: () => (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Loading AFP register…</p>
    </div>
  ),
});

export default function AfpRegisterPage() {
  return <View />;
}
