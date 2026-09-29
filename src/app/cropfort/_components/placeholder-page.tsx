"use client";

import { Construction } from "lucide-react";
import { usePathname } from "next/navigation";
import { EmptyState, PageContainer, PageHeader } from "@/components/cropfort/page-shell";
import { getCropfortAreaByHref } from "@/config/cropfort-areas";
import { CropfortAreaWorkspace } from "@/components/cropfort/area-workspace";

/** Fallback for legacy stub routes — prefer area shells when known. */
export default function CropfortPlaceholderPage() {
  const pathname = usePathname();
  const area = getCropfortAreaByHref(pathname);

  if (area && area.readiness === "shell") {
    return <CropfortAreaWorkspace area={area} />;
  }

  return (
    <PageContainer>
      <PageHeader title={area?.label ?? "Page"} />
      <EmptyState
        icon={Construction}
        title="Coming soon"
      />
    </PageContainer>
  );
}
