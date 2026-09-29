"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";
import { useCreateAfe } from "@/lib/query/hooks/use-afes";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { fmtEtb } from "@/store/cropfortOpsStore";
import type { AfpPromotion } from "@/types/core-ops";

type RegisterRow = {
  plan: ProgrammePlanDto;
  promo: AfpPromotion;
};

export default function AfpRegisterView() {
  const { activeProgram } = useCropfortAuth();
  const area = getCropfortArea("afp");
  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id));
  const createAfe = useCreateAfe();
  const [raisingId, setRaisingId] = useState<string | null>(null);

  const rows = useMemo<RegisterRow[]>(() => {
    const plans = plansQuery.data || [];
    return plans
      .flatMap((plan) =>
        (plan.promotions || []).map((promo) => ({
          plan,
          promo,
        })),
      )
      .sort((a, b) => (b.promo.createdAt || "").localeCompare(a.promo.createdAt || ""));
  }, [plansQuery.data]);

  const raiseFromPromotion = async (row: RegisterRow) => {
    const { plan, promo } = row;
    setRaisingId(promo.id);
    try {
      const afe = await createAfe.mutateAsync({
        title: `${plan.name || plan.farmName || "Estate"} AFP · ${plan.budgetYearLabel ?? ""}`.trim(),
        amountEtb: Number(promo.totalEtb) || 0,
        band: promo.band,
        sourceType: "afp_line",
        sourceId: plan.id,
      });
      toast.success(`AFE drafted`, {
        description: `${afe.title} · Band ${afe.band}`,
        action: {
          label: "Open AFE",
          onClick: () => {
            window.location.href = CROPFORT_ROUTES.afe;
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not raise AFE");
    } finally {
      setRaisingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Commit"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "AFP" },
        ]}
        actions={
          <Button size="sm" asChild>
            <Link href={CROPFORT_ROUTES.programmePlans}>Programme Plans</Link>
          </Button>
        }
      />

      <SectionCard title="AFP register" flush>
        {plansQuery.isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Loading AFP register…
          </div>
        ) : plansQuery.isError ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Could not load programme plans.
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No AFPs yet. Submit a programme plan to promote here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ plan, promo }) => {
              const approved =
                promo.status === "auto_approved" || promo.status === "approved";
              return (
                <li
                  key={`${plan.id}:${promo.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-4"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {plan.name || plan.farmName} · {plan.budgetYearLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">{promo.note}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {fmtEtb(promo.totalEtb)}
                  </span>
                  <StatusBadge
                    status={
                      approved
                        ? "approved"
                        : promo.status === "returned"
                          ? "returned"
                          : "submitted"
                    }
                  />
                  <StatusBadge status="draft" label={`Band ${promo.band}`} />
                  {approved ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={createAfe.isPending && raisingId === promo.id}
                      onClick={() => void raiseFromPromotion({ plan, promo })}
                    >
                      {raisingId === promo.id ? "Raising…" : "Raise AFE"}
                    </Button>
                  ) : promo.status === "returned" ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`${CROPFORT_ROUTES.programmePlans}/${plan.id}`}>
                        Revise plan
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={CROPFORT_ROUTES.approvals}>Approvals</Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  );
}
