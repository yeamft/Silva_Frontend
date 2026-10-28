"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Database, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAnnualPlanBenchmarks, importAnnualPlanBenchmarks } from "@/lib/api/annual-plan-benchmarks";
import type { BenchmarkActivity } from "@/lib/annual-plan-budget";
import type { BenchmarkFarmInputs } from "@/lib/benchmark-data";
import { cn } from "@/lib/utils";

/** Column order of the Benchmark Data sheet; JSONB doesn't keep key order. */
const FARM_ORDER = ["Telli", "Gawi", "Chetu", "Ephrata", "Kamisse", "Shakisso"];
const INDUSTRY_FARMS = new Set(["Telli", "Gawi", "Chetu"]);

type Props = {
  /** Taxonomy activity chosen in the form, used to find its benchmark row. */
  activityId?: string;
  activityCode?: string;
  activityUnit?: string;
  onApply: (farms: BenchmarkFarmInputs, meta: { dataNotes: string; sourceEvidence: string }) => void;
};

type Choice = { name: string; selected: boolean; industry: boolean };

function fmt(n: number | null | undefined, digits = 2) {
  return n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function farmNames(row: BenchmarkActivity) {
  const names = Object.keys(row.farms);
  return [...FARM_ORDER.filter((n) => names.includes(n)), ...names.filter((n) => !FARM_ORDER.includes(n))];
}

export function BenchmarkSourcePicker({ activityId, activityCode, activityUnit, onApply }: Props) {
  const query = useQuery({
    queryKey: ["annual-plan-benchmarks", "latest"],
    queryFn: () => getAnnualPlanBenchmarks(),
    staleTime: 5 * 60_000,
  });
  const set = query.data;
  const rows = useMemo(() => set?.activities ?? [], [set]);

  const matched = useMemo(
    () =>
      (activityId && rows.find((r) => r.taxonomyActivityId === activityId)) ||
      (activityCode && rows.find((r) => r.code === activityCode)) ||
      null,
    [rows, activityId, activityCode],
  );

  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);

  // Follow the form's activity; the user can still pick a different benchmark row.
  useEffect(() => {
    setCode(matched?.code ?? null);
  }, [matched?.code]);

  const row = rows.find((r) => r.code === code) ?? null;

  useEffect(() => {
    if (!row) {
      setChoices([]);
      return;
    }
    setChoices(
      farmNames(row).map((name) => ({
        name,
        selected: row.farms[name]?.costPerUnit != null,
        industry: INDUSTRY_FARMS.has(name),
      })),
    );
  }, [row]);

  const grouped = useMemo(() => {
    const groups = new Map<string, BenchmarkActivity[]>();
    for (const r of rows) groups.set(r.category, [...(groups.get(r.category) ?? []), r]);
    return [...groups.entries()];
  }, [rows]);

  const importWorkbook = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await importAnnualPlanBenchmarks(file);
      await queryClient.invalidateQueries({ queryKey: ["annual-plan-benchmarks"] });
      toast.success(`Imported ${result.activities} benchmark activities from ${result.sourceFile}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const importButton = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => void importWorkbook(e.target.files?.[0])}
      />
      <Button type="button" size="sm" variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
        <Upload className="mr-1.5 h-4 w-4" aria-hidden />
        {importing ? "Importing…" : rows.length ? "Re-import workbook" : "Import workbook"}
      </Button>
    </>
  );

  if (query.isError || (!query.isLoading && rows.length === 0)) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-muted/30 p-3" aria-label="Import from benchmark data">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-medium">Import from benchmark data</p>
              <p className="text-xs text-muted-foreground">
                {query.isError
                  ? `Couldn't load benchmark data: ${query.error instanceof Error ? query.error.message : "request failed"}`
                  : 'No benchmark data yet. Import the annual-plan workbook (.xlsx with a "Benchmark Data" sheet) to pick farm rates from it.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {query.isError ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => void query.refetch()}>
                Retry
              </Button>
            ) : null}
            {importButton}
          </div>
        </div>
      </section>
    );
  }

  const selectedCount = choices.filter((c) => c.selected).length;
  const unitMismatch =
    row && activityUnit && row.unit && row.unit.toLowerCase() !== activityUnit.toLowerCase();

  const toggle = (name: string, field: "selected" | "industry", value: boolean) =>
    setChoices((list) => list.map((c) => (c.name === name ? { ...c, [field]: value } : c)));

  const apply = () => {
    if (!row) return;
    const farms = choices
      .filter((c) => c.selected)
      .map((c) => ({
        name: c.name,
        includeInIndustryAverage: c.industry,
        costPerUnit: row.farms[c.name]?.costPerUnit ?? null,
        manDaysPerUnit: row.farms[c.name]?.manDaysPerUnit ?? null,
        frequency: row.farms[c.name]?.frequency ?? null,
      }));
    onApply(farms, {
      dataNotes: row.dataNotes ?? "",
      sourceEvidence: `B-Agro benchmark ${set?.version ?? ""} · ${row.code} ${row.activity}`.replace(/\s+/g, " ").trim(),
    });
  };

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/5 p-3" aria-label="Import from benchmark data">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium">Import from benchmark data</p>
            <p className="text-xs text-muted-foreground">
              {query.isLoading
                ? "Loading benchmark set…"
                : `${set?.version || "Latest set"} · ${rows.length} activities`}
              {matched ? ` · matched ${matched.code}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
        {importButton}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="max-w-full justify-between sm:w-72" disabled={query.isLoading}>
              <span className="truncate">{row ? `${row.code} · ${row.activity}` : "Choose benchmark activity"}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(24rem,90vw)] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search code or activity…" />
              <CommandList className="max-h-72">
                <CommandEmpty>No benchmark activity found.</CommandEmpty>
                {grouped.map(([category, items]) => (
                  <CommandGroup key={category} heading={category}>
                    {items.map((r) => (
                      <CommandItem
                        key={r.code}
                        value={`${r.code} ${r.activity} ${r.subgroup}`}
                        onSelect={() => {
                          setCode(r.code);
                          setPickerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", r.code === code ? "opacity-100" : "opacity-0")} aria-hidden />
                        <span className="mr-2 font-mono text-[11px] text-muted-foreground">{r.code}</span>
                        <span className="truncate">{r.activity}</span>
                        <span className="ml-auto pl-2 text-xs text-muted-foreground">{r.unit}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      {row ? (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {row.category} · {row.subgroup} · per {row.unit}
            {unitMismatch ? (
              <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                · benchmark unit differs from the activity&apos;s unit ({activityUnit})
              </span>
            ) : null}
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <span className="sr-only">Use</span>
                  </th>
                  <th className="px-3 py-2">Farm</th>
                  <th className="px-3 py-2 text-right">Cost / unit</th>
                  <th className="px-3 py-2 text-right">Man-days</th>
                  <th className="px-3 py-2 text-right">Freq.</th>
                  <th className="px-3 py-2 text-center">Industry avg</th>
                </tr>
              </thead>
              <tbody>
                {choices.map((c) => {
                  const rate = row.farms[c.name];
                  const hasRate = rate?.costPerUnit != null;
                  return (
                    <tr key={c.name} className={cn("border-t border-border", !hasRate && "text-muted-foreground")}>
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={c.selected}
                          disabled={!hasRate}
                          aria-label={`Use ${c.name}`}
                          onCheckedChange={(v) => toggle(c.name, "selected", v === true)}
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      {hasRate ? (
                        <>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(rate.costPerUnit)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(rate.manDaysPerUnit, 3)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(rate.frequency)}</td>
                        </>
                      ) : (
                        <td colSpan={3} className="px-3 py-2 text-right text-xs">
                          Doesn&apos;t plan this activity
                        </td>
                      )}
                      <td className="px-3 py-2 text-center">
                        <Checkbox
                          checked={c.industry}
                          disabled={!c.selected}
                          aria-label={`Include ${c.name} in industry average`}
                          onCheckedChange={(v) => toggle(c.name, "industry", v === true)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {row.dataNotes ? <p className="mt-2 text-xs text-muted-foreground">Note: {row.dataNotes}</p> : null}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {selectedCount === 0 ? (
              <span className="text-xs text-muted-foreground">No farm has a rate for this activity.</span>
            ) : null}
            <Button type="button" size="sm" disabled={selectedCount === 0} onClick={apply}>
              Use {selectedCount} farm{selectedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </>
      ) : !query.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {activityId ? "No benchmark row matches this activity — choose one above." : "Pick an activity, or choose a benchmark activity above."}
        </p>
      ) : null}
    </section>
  );
}
