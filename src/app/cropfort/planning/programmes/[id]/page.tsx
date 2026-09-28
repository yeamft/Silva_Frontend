"use client";

import dynamic from "next/dynamic";
import { use, useEffect } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { usePlanningContextStore } from "@/store/planningContextStore";

const View = dynamic(() => import("../../../afp/core-operations-view"), {
  ssr: false,
  loading: () => (
    <div className="cf-page">
      <p className="text-sm text-muted-foreground">Loading programme plan…</p>
    </div>
  ),
});

export default function ProgrammePlanEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeProgram } = useCropfortAuth();
  const setActivePlanId = usePlanningContextStore((s) => s.setActivePlanId);

  useEffect(() => {
    if (activeProgram?.id && id) {
      setActivePlanId(activeProgram.id, id);
    }
  }, [activeProgram?.id, id, setActivePlanId]);

  return <View planId={id} />;
}
