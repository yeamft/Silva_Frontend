"use client";

import { usePathname } from "next/navigation";
import { Construction } from "lucide-react";
import { EmptyState, PageContainer, PageHeader } from "@/components/cropfort/page-shell";
import { CROPFORT_ROUTES } from "@/config/navigation";

const ROUTE_LABELS: Record<string, string> = {
  [CROPFORT_ROUTES.fieldTickets]: "Field Tickets",
  [CROPFORT_ROUTES.weeklySubmissions]: "Weekly Submissions",
  [CROPFORT_ROUTES.blocksActivities]: "Blocks & Activities",
  [CROPFORT_ROUTES.afp]: "AFP",
  [CROPFORT_ROUTES.validationQueue]: "Validation Queue",
  [CROPFORT_ROUTES.afe]: "AFE",
  [CROPFORT_ROUTES.auditTrail]: "Audit Trail",
  [CROPFORT_ROUTES.reports]: "Reports",
  [CROPFORT_ROUTES.tenantConfig]: "Tenant Configuration",
  [CROPFORT_ROUTES.activityTemplates]: "Activity Templates",
  [CROPFORT_ROUTES.systemSettings]: "System Settings",
};

export default function CropfortPlaceholderPage() {
  const pathname = usePathname();
  const label = ROUTE_LABELS[pathname] ?? "Page";

  return (
    <PageContainer>
      <PageHeader title={label} />
      <EmptyState icon={Construction} title="Coming soon" />
    </PageContainer>
  );
}
