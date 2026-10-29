"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("@/components/cropfort/returned-plans-view"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function ReturnedPlansPage() {
  return <View />;
}
