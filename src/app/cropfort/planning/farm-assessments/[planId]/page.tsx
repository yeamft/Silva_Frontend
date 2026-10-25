"use client";

import { use } from "react";
import Link from "next/link";
import { FarmAssessmentSection } from "@/components/cropfort/farm-assessment";
import { PageContainer, PageHeader } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";

export default function FarmAssessmentPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = use(params);
  const { activeProgram } = useCropfortAuth();
  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id));
  const plan = plansQuery.data?.find((item) => item.id === planId);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Workspace"}
        title={plan?.name || "Farm Assessment"}
        description={plan ? `${plan.farmName || "Farm"} · ${plan.planningCycleLabel || plan.budgetYearLabel}` : "Farm condition report and asset owner review"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Farm Assessments", href: CROPFORT_ROUTES.farmAssessments },
          { label: "Assessment" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.farmAssessments}>All assessments</Link>
          </Button>
        }
      />
      <FarmAssessmentSection key={`${activeProgram?.id}-${planId}`} planId={planId} />
    </PageContainer>
  );
}
