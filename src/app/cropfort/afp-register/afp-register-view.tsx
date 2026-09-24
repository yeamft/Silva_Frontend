"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { fmtEtb, useCropfortOpsStore } from "@/store/cropfortOpsStore";

export default function AfpRegisterView() {
  const { activeProgram } = useCropfortAuth();
  const area = getCropfortArea("afp");
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const promotions = plan?.promotions ?? [];
  const raiseAfe = useCropfortOpsStore((s) => s.raiseAfe);
  const nodes = useCropfortOpsStore((s) => s.nodes);
  const fallbackBlock = nodes.find((n) => n.kind === "block")?.id ?? "";
  const planBlock = plan?.applicableBlockIds.find(Boolean) || fallbackBlock;

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
            <Link href={CROPFORT_ROUTES.coreOperations}>Open Core Operations</Link>
          </Button>
        }
      />

      <SectionCard title="AFP register" flush>
        {promotions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No AFPs yet. Submit a Core Operations plan to promote here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {promotions.map((p) => {
              const approved = p.status === "auto_approved" || p.status === "approved";
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {plan?.farmName} · {plan?.budgetYearLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.note}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{fmtEtb(p.totalEtb)}</span>
                  <StatusBadge
                    status={
                      approved
                        ? "approved"
                        : p.status === "returned"
                          ? "returned"
                          : "submitted"
                    }
                  />
                  <StatusBadge status="draft" label={`Band ${p.band}`} />
                  {approved ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!planBlock}
                      onClick={() => {
                        const afe = raiseAfe({
                          title:
                            `${plan?.farmName ?? "Estate"} AFP · ${plan?.budgetYearLabel ?? ""}`.trim(),
                          sourceType: "afp",
                          sourceId: p.id,
                          blockId: planBlock,
                          amountEtb: p.totalEtb,
                        });
                        toast.success(`${afe.code} drafted`, {
                          action: {
                            label: "Open AFE",
                            onClick: () => {
                              window.location.href = CROPFORT_ROUTES.afe;
                            },
                          },
                        });
                      }}
                    >
                      Raise AFE
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
