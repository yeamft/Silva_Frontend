"use client";

import { useEffect } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  useEligibleChecker,
  useWorkflowBudgetYears,
  useWorkflowFarmAreas,
  useWorkflowPrograms,
} from "@/lib/query";
import type { WorkflowContextFilters } from "@/types/rate-card-workflow";
import { USE_RATE_CARD_MOCK } from "@/types/rate-card-workflow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STORAGE_KEY = "cropfort.rate-card-workflow.context";

export function loadWorkflowContext(): WorkflowContextFilters {
  const year = String(new Date().getFullYear());
  if (typeof window === "undefined") {
    return { programId: "", budgetYearId: year, farmAreaId: "all" };
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WorkflowContextFilters;
  } catch {
    /* ignore */
  }
  return { programId: "", budgetYearId: year, farmAreaId: "all" };
}

export function saveWorkflowContext(next: WorkflowContextFilters) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function WorkflowContextBar({
  value,
  onChange,
}: {
  value: WorkflowContextFilters;
  onChange: (next: WorkflowContextFilters) => void;
}) {
  const { activeProgram } = useCropfortAuth();
  const programs = useWorkflowPrograms();
  const programList = programs.data ?? [];
  const programIdForQueries =
    value.programId ||
    (USE_RATE_CARD_MOCK ? programList[0]?.id : activeProgram?.id) ||
    "";
  const years = useWorkflowBudgetYears(programIdForQueries);
  const areas = useWorkflowFarmAreas(programIdForQueries);
  const checker = useEligibleChecker(
    programIdForQueries,
    value.farmAreaId === "all" ? null : value.farmAreaId,
  );

  const yearOptions = years.data ?? [];
  const areaOptions = areas.data ?? [];

  useEffect(() => {
    saveWorkflowContext(value);
  }, [value]);

  // Pin program to a valid option (mock catalog, or live active program).
  useEffect(() => {
    if (USE_RATE_CARD_MOCK) {
      if (!programList.length) return;
      if (programList.some((p) => p.id === value.programId)) return;
      onChange({
        programId: programList[0].id,
        budgetYearId: value.budgetYearId,
        farmAreaId: value.farmAreaId === "all" ? "all" : value.farmAreaId,
      });
      return;
    }
    if (!activeProgram?.id) return;
    if (value.programId === activeProgram.id) return;
    onChange({
      ...value,
      programId: activeProgram.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync program catalog only
  }, [activeProgram?.id, programList, value.programId]);

  useEffect(() => {
    if (!yearOptions.length) return;
    if (yearOptions.some((y) => y.id === value.budgetYearId)) return;
    onChange({
      programId: value.programId || programIdForQueries,
      farmAreaId: value.farmAreaId,
      budgetYearId: yearOptions[0].id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps
  }, [yearOptions, value.budgetYearId, value.programId, value.farmAreaId]);

  useEffect(() => {
    if (!areaOptions.length) return;
    const valid =
      value.farmAreaId === "all" || areaOptions.some((a) => a.id === value.farmAreaId);
    if (valid) return;
    onChange({ ...value, farmAreaId: areaOptions[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconcile stale farm ids only
  }, [areaOptions, value.farmAreaId]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Program</p>
          <Select
            value={value.programId}
            onValueChange={(programId) =>
              onChange({ programId, budgetYearId: value.budgetYearId, farmAreaId: "all" })
            }
          >
            <SelectTrigger className="h-9 w-[200px]" aria-label="Program">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              {programList.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Budget year</p>
          <Select
            value={value.budgetYearId}
            onValueChange={(budgetYearId) => onChange({ ...value, budgetYearId })}
          >
            <SelectTrigger className="h-9 w-[140px]" aria-label="Budget year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Farm</p>
          <Select
            value={value.farmAreaId}
            onValueChange={(farmAreaId) =>
              onChange({ ...value, farmAreaId: farmAreaId as WorkflowContextFilters["farmAreaId"] })
            }
          >
            <SelectTrigger className="h-9 w-[180px]" aria-label="Farm area">
              <SelectValue placeholder="Farm area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All farms</SelectItem>
              {areaOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {checker.data ? (
        <p className="text-xs text-muted-foreground sm:text-right">
          <span className="font-medium text-foreground">Reviewer:</span> {checker.data.name}
          <span className="text-muted-foreground">
            {" "}
            · {checker.data.orgName} · {checker.data.assignmentLabel}
          </span>
        </p>
      ) : null}
    </div>
  );
}
