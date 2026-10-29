"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Pencil, Plus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { BenchmarkSourcePicker } from "@/components/rate-cards/benchmark-source-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAnnualPlanBenchmarks, getScenarioSettings } from "@/lib/api/annual-plan-benchmarks";
import { createQuickRateCard } from "@/lib/api/rate-card-proposals";
import { buildBenchmarkData, findDuplicateBenchmarkFarmName, type BenchmarkFarmInputs } from "@/lib/benchmark-data";
import { cn } from "@/lib/utils";
import type { RatePlanBasis } from "@/types/rate-card-workflow";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Benchmark Data sheet column order; the first three make the industry average. */
const FARM_ORDER = ["Telli", "Gawi", "Chetu", "Ephrata", "Kamisse", "Shakisso"];
const INDUSTRY_FARMS = new Set(["Telli", "Gawi", "Chetu"]);

type Props = {
  farmEstateId: string;
  budgetYear: number;
  activity: { activityId: string; activityCode: string; activityName: string; uom: string };
  /** Cost type of the registered activity; it isn't changed here. */
  kind: "labor" | "materials" | "services";
  currentRate: number | null;
  onSaved: () => Promise<void> | void;
  /** Called the moment Save is pressed, so the plan shows the new rate straight away. */
  onApplied?: (rate: number) => void;
  /** The save failed after onApplied — put the old rate back. */
  onFailed?: () => void;
  onClose: () => void;
};

/**
 * The activity's rate card, opened from the Core Operations Activities step. Source farm rates fill in
 * from the uploaded benchmark data; the user picks one of the rate scenarios (or types their own) and
 * saves. Saving records the benchmark, builds the rate card from it and publishes it.
 */
export function ActivityRateCardPanel({
  farmEstateId,
  budgetYear,
  activity,
  kind,
  currentRate,
  onSaved,
  onApplied,
  onFailed,
  onClose,
}: Props) {
  const [farms, setFarms] = useState<BenchmarkFarmInputs>([]);
  const [dataNotes, setDataNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [basis, setBasis] = useState<RatePlanBasis>("industry_average");
  const [expertRate, setExpertRate] = useState(currentRate != null ? String(round2(currentRate)) : "");
  const [justification, setJustification] = useState("");
  const [showFarms, setShowFarms] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const bandsQuery = useQuery({
    queryKey: ["annual-plan-benchmarks", "settings"],
    queryFn: getScenarioSettings,
    staleTime: 5 * 60_000,
  });
  const band1 = bandsQuery.data?.band1Pct ?? 25;
  const band2 = bandsQuery.data?.band2Pct ?? 50;

  // Fill the source farms from the uploaded benchmark data as soon as it's here
  const benchmarkQuery = useQuery({
    queryKey: ["annual-plan-benchmarks", "latest"],
    queryFn: () => getAnnualPlanBenchmarks(),
    staleTime: 5 * 60_000,
  });
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !benchmarkQuery.isFetched) return;
    prefilled.current = true;
    const rows = benchmarkQuery.data?.activities ?? [];
    const row =
      rows.find((r) => r.taxonomyActivityId === activity.activityId) || rows.find((r) => r.code === activity.activityCode);
    const names = row ? Object.keys(row.farms) : [];
    const ordered = [...FARM_ORDER.filter((n) => names.includes(n)), ...names.filter((n) => !FARM_ORDER.includes(n))];
    const rated = row
      ? ordered
          .filter((name) => row.farms[name]?.costPerUnit != null)
          .map((name) => ({
            name,
            includeInIndustryAverage: INDUSTRY_FARMS.has(name),
            costPerUnit: row.farms[name]?.costPerUnit ?? null,
            manDaysPerUnit: row.farms[name]?.manDaysPerUnit ?? null,
            frequency: row.farms[name]?.frequency ?? null,
          }))
      : [];
    if (row && rated.length) {
      setFarms(rated);
      setDataNotes(row.dataNotes ?? "");
      setEvidence(`B-Agro benchmark ${benchmarkQuery.data?.version ?? ""} · ${row.code} ${row.activity}`.replace(/\s+/g, " ").trim());
    } else {
      // Nothing to start from: the user types their own rate
      setBasis("expert_input");
    }
  }, [benchmarkQuery.isFetched, benchmarkQuery.data, benchmarkQuery.dataUpdatedAt, activity.activityId, activity.activityCode]);

  const data = buildBenchmarkData(farms, dataNotes);
  // Industry average, else the all-farm average when no industry farm has a rate
  const industry =
    data.recommendedSource === "industry_average" ? data.industryAverage.costPerUnit : data.sixFarmAverage.costPerUnit;
  const avg = data.recommendedSource === "industry_average" ? data.industryAverage : data.sixFarmAverage;
  const expert = expertRate.trim() === "" ? null : Number(expertRate);
  const hasFarmRates = industry != null;

  const scenarios: { id: RatePlanBasis; label: string; rate: number | null }[] = [
    { id: "industry_average", label: "Industry average", rate: industry },
    { id: "plus_25", label: `+${band1}%`, rate: industry != null ? round2(industry * (1 + band1 / 100)) : null },
    { id: "plus_50", label: `+${band2}%`, rate: industry != null ? round2(industry * (1 + band2 / 100)) : null },
  ];
  const effectiveBasis: RatePlanBasis =
    basis === "expert_input" || scenarios.find((s) => s.id === basis)?.rate == null ? "expert_input" : basis;
  const planRate = effectiveBasis === "expert_input" ? expert : scenarios.find((s) => s.id === effectiveBasis)?.rate ?? null;
  const needsReason = effectiveBasis === "expert_input";
  const usedFarms = farms.filter((f) => f.name.trim() && f.costPerUnit != null);

  const save = async () => {
    const duplicate = findDuplicateBenchmarkFarmName(farms);
    if (duplicate) return toast.error(`Source farm "${duplicate}" is listed more than once`);
    if (planRate == null || !Number.isFinite(planRate) || planRate < 0) return toast.error("Choose a rate");
    if (needsReason && !justification.trim()) return toast.error("Say why you're using your own rate");

    // One request does the whole chain; the plan shows the new rate straight away
    const request = hasFarmRates
      ? createQuickRateCard(farmEstateId, {
          mode: "survey",
          survey: {
            activityId: activity.activityId,
            benchmarkData: { farms: farms.filter((f) => f.name.trim()), dataNotes: dataNotes.trim() },
            sourceEvidence: evidence.trim(),
            notes: dataNotes.trim(),
          },
          card: {
            budgetYear,
            norm: avg.manDaysPerUnit,
            sourceBasis: "Core Operations plan",
            sourceEvidence: evidence.trim(),
            justificationNote: justification.trim(),
          },
          planBasis: effectiveBasis,
          ...(expert != null ? { expertRate: expert } : {}),
        })
      : createQuickRateCard(farmEstateId, {
          mode: "import",
          card: {
            activityId: activity.activityId,
            kind,
            proposedRate: planRate,
            budgetYear,
            sourceBasis: "Expert input · Core Operations plan",
            sourceEvidence: evidence.trim(),
            justificationNote: justification.trim(),
          },
        });

    if (onApplied) {
      onApplied(planRate);
      toast.success(`${activity.activityName} now uses ${fmtEtb(planRate)} per ${activity.uom}`);
      onClose();
      void request
        .then(() => onSaved())
        .catch((err) => {
          onFailed?.();
          toast.error(err instanceof Error ? `${activity.activityName}: ${err.message}` : "Could not save the rate");
        });
      return;
    }

    setSaving(true);
    try {
      await request;
      await onSaved();
      toast.success(`${activity.activityName} now uses ${fmtEtb(planRate)} per ${activity.uom}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the rate");
    } finally {
      setSaving(false);
    }
  };

  const choiceClass = (selected: boolean, available: boolean) =>
    cn(
      "cf-focus relative flex flex-col rounded-xl border p-3 text-left transition-colors",
      selected
        ? "border-primary bg-primary/[0.07] shadow-[0_0_0_1px_hsl(var(--primary))]"
        : available
          ? "border-border bg-card hover:border-primary/40"
          : "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-60",
    );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-semibold">{activity.activityName}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{activity.activityCode}</span> · per {activity.uom}
          {currentRate != null ? ` · now ${fmtEtb(currentRate)}` : ""}
        </p>
      </div>

      {/* 1 — the rate */}
      <section className="space-y-2">
        {benchmarkQuery.isLoading ? (
          <p className="rounded-xl bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">Loading benchmark rates…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {scenarios.map((s, i) => {
              const selected = effectiveBasis === s.id;
              const available = s.rate != null;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  disabled={!available || saving}
                  onClick={() => setBasis(s.id)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  whileTap={available ? { scale: 0.97 } : undefined}
                  className={choiceClass(selected, available)}
                  aria-pressed={selected}
                >
                  {selected ? (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                  ) : null}
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <span className="mt-1 text-lg font-semibold tabular-nums">{available ? fmtEtb(s.rate) : "—"}</span>
                </motion.button>
              );
            })}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.12 }}
              className={choiceClass(effectiveBasis === "expert_input", true)}
              onClick={() => setBasis("expert_input")}
            >
              {effectiveBasis === "expert_input" ? (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Pencil className="h-3 w-3" aria-hidden /> My own rate
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="ETB"
                value={expertRate}
                disabled={saving}
                onFocus={() => setBasis("expert_input")}
                onChange={(e) => {
                  setExpertRate(e.target.value);
                  setBasis("expert_input");
                }}
                className="mt-1 h-9 text-base font-semibold tabular-nums"
                aria-label="My own rate"
              />
            </motion.div>
          </div>
        )}
      </section>

      <AnimatePresence initial={false}>
        {needsReason ? (
          <motion.div
            key="reason"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <label htmlFor={`rc-reason-${activity.activityId}`} className="text-sm font-medium">
              Why this rate? <span className="text-destructive">*</span>
            </label>
            <Textarea
              id={`rc-reason-${activity.activityId}`}
              rows={2}
              value={justification}
              disabled={saving}
              placeholder={hasFarmRates ? "e.g. Steeper slopes on this farm take more labour" : "Where this rate comes from"}
              onChange={(e) => setJustification(e.target.value)}
              className="mt-1.5"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 2 — where the benchmark comes from, folded away */}
      <section className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setShowFarms((v) => !v)}
          aria-expanded={showFarms}
          className="cf-focus flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-medium">
              Source farms
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                {usedFarms.length}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-primary">{showFarms ? "Close" : "Change"}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", showFarms && "rotate-180")} aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {showFarms ? (
            <motion.div
              key="farms"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-border p-3">
                <FarmRatesTable farms={farms} uom={activity.uom} disabled={saving} onChange={setFarms} />

                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { label: "Industry average", avg: data.industryAverage, on: data.recommendedSource === "industry_average" },
                    { label: "All-farm average", avg: data.sixFarmAverage, on: data.recommendedSource === "six_farm_fallback" },
                  ].map((x) => (
                    <div
                      key={x.label}
                      className={cn("rounded-lg border px-3 py-2", x.on ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-muted/30")}
                    >
                      <p className="text-[11px] text-muted-foreground">{x.label}</p>
                      <p className="text-sm font-semibold tabular-nums">{fmtEtb(x.avg.costPerUnit)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    disabled={saving}
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      prefilled.current = false;
                      void benchmarkQuery.refetch();
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className="font-medium text-primary hover:underline"
                    onClick={() => setShowPicker((v) => !v)}
                  >
                    {showPicker ? "Hide import" : "Import"}
                  </button>
                </div>

                {showPicker ? (
                <BenchmarkSourcePicker
                  activityId={activity.activityId}
                  activityCode={activity.activityCode}
                  activityUnit={activity.uom}
                  onApply={(imported, meta) => {
                    // Imported farms replace same-named ones; farms added by hand stay
                    const names = new Set(imported.map((f) => f.name.toLocaleLowerCase()));
                    setFarms((current) => [
                      ...current.filter((f) => f.name.trim() && !names.has(f.name.trim().toLocaleLowerCase())),
                      ...imported,
                    ]);
                    if (!dataNotes.trim() && meta.dataNotes) setDataNotes(meta.dataNotes);
                    if (!evidence.trim()) setEvidence(meta.sourceEvidence);
                    setBasis("industry_average");
                  }}
                />
                ) : null}
                <div className="space-y-1.5">
                  <label htmlFor={`rc-evidence-${activity.activityId}`} className="text-sm font-medium">
                    Source
                  </label>
                  <Input
                    id={`rc-evidence-${activity.activityId}`}
                    value={evidence}
                    disabled={saving}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
        <div className="mr-auto leading-tight">
          <p className="text-xs text-muted-foreground">Plan rate</p>
          <p className="text-xl font-semibold tabular-nums">
            {fmtEtb(planRate)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">per {activity.uom}</span>
          </p>
        </div>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() => void save()}
          disabled={saving || planRate == null || !Number.isFinite(planRate) || (needsReason && !justification.trim())}
          className="min-w-[8rem]"
        >
          {saving ? "Saving…" : "Save rate"}
        </Button>
      </div>
    </div>
  );
}

/** Source farm rates as one small editable table: a row per farm, star = counts toward the industry average. */
function FarmRatesTable({
  farms,
  uom,
  disabled,
  onChange,
}: {
  farms: BenchmarkFarmInputs;
  uom: string;
  disabled?: boolean;
  onChange: (farms: BenchmarkFarmInputs) => void;
}) {
  const update = (index: number, patch: Partial<BenchmarkFarmInputs[number]>) =>
    onChange(farms.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const num = (v: string) => (v.trim() === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const cell =
    "h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm tabular-nums outline-none transition-colors hover:border-border focus:border-primary focus:bg-background [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60";

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="bg-muted/40 text-left text-[11px] text-muted-foreground">
          <tr>
            <th className="px-2 py-2 font-medium">Farm</th>
            <th className="px-2 py-2 text-right font-medium">Cost / {uom} (ETB)</th>
            <th className="px-2 py-2 text-right font-medium">Man-days</th>
            <th className="px-2 py-2 text-right font-medium">Times / yr</th>
            <th className="px-2 py-2 text-center font-medium" title="Counts toward the industry average">
              Industry
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {farms.map((f, i) => (
              <motion.tr
                key={i}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="border-t border-border"
              >
                <td className="px-1 py-1">
                  <input
                    value={f.name}
                    placeholder="Farm name"
                    disabled={disabled}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className={cn(cell, "font-medium")}
                    aria-label="Farm name"
                  />
                </td>
                {(["costPerUnit", "manDaysPerUnit", "frequency"] as const).map((key) => (
                  <td key={key} className="px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={f[key] ?? ""}
                      placeholder="—"
                      disabled={disabled || !f.name.trim()}
                      onChange={(e) => update(i, { [key]: num(e.target.value) })}
                      className={cn(cell, "text-right")}
                      aria-label={`${f.name || "Farm"} ${key === "costPerUnit" ? "cost per unit" : key === "manDaysPerUnit" ? "man-days per unit" : "times per year"}`}
                    />
                  </td>
                ))}
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    disabled={disabled || !f.name.trim()}
                    aria-pressed={f.includeInIndustryAverage}
                    title={f.includeInIndustryAverage ? "Counts toward the industry average" : "Not in the industry average"}
                    onClick={() => update(i, { includeInIndustryAverage: !f.includeInIndustryAverage })}
                    className={cn(
                      "cf-focus inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40",
                      f.includeInIndustryAverage ? "bg-primary/10 text-primary" : "text-muted-foreground/50 hover:text-foreground",
                    )}
                  >
                    <Star className={cn("h-4 w-4", f.includeInIndustryAverage && "fill-current")} aria-hidden />
                  </button>
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remove ${f.name || "farm"}`}
                    onClick={() => onChange(farms.filter((_, j) => j !== i))}
                    className="cf-focus inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...farms,
            { name: "", includeInIndustryAverage: false, costPerUnit: null, manDaysPerUnit: null, frequency: null },
          ])
        }
        className="cf-focus flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border py-2 text-xs font-medium text-primary hover:bg-primary/[0.04]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden /> Add farm
      </button>
    </div>
  );
}
