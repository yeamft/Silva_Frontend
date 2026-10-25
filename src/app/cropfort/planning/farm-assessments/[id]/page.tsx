"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/cropfort/page-shell";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { getFarmAssessment } from "@/lib/api/farm-assessments";
import { FarmAssessmentSection } from "@/components/cropfort/farm-assessment";

export default function FarmAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeProgram } = useCropfortAuth();

  const query = useQuery({
    queryKey: ["farm-assessment", id],
    queryFn: () => getFarmAssessment(id),
    enabled: Boolean(activeProgram?.id),
  });

  const assessment = query.data;
  const title = assessment?.title || "Farm Assessment";
  const description = [
    assessment?.farmEstateId ? null : null, // farmName resolved in component
    assessment?.cycleLabel,
  ].filter(Boolean).join(" · ") || "Farm condition report and asset owner review";

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Workspace"}
        title={title}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Farm Assessments", href: CROPFORT_ROUTES.farmAssessments },
          { label: "Assessment" },
        ]}
        meta={description ? <span>{description}</span> : undefined}
        actions={
          <Button variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.farmAssessments}>All assessments</Link>
          </Button>
        }
      />
      <FarmAssessmentSection assessmentId={id} />
    </PageContainer>
  );
}
