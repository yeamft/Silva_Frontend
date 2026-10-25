"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { BenchmarkFarmInputs, BenchmarkFarmValues } from "@/lib/benchmark-data";

type Props = {
  value: BenchmarkFarmInputs;
  onChange: (value: BenchmarkFarmInputs) => void;
  disabled?: boolean;
};

const FIELDS: { key: keyof BenchmarkFarmValues; label: string; step: string }[] = [
  { key: "costPerUnit", label: "Cost / unit (ETB)", step: "0.01" },
  { key: "manDaysPerUnit", label: "Man-days / unit", step: "0.001" },
  { key: "frequency", label: "Frequency / year", step: "0.01" },
];

export function BenchmarkFarmDataFields({ value, onChange, disabled = false }: Props) {
  const update = (
    index: number,
    field: keyof BenchmarkFarmValues | "name" | "includeInIndustryAverage",
    raw: string | boolean,
  ) => {
    const next = value.map((farm, farmIndex) => {
      if (farmIndex !== index) return farm;
      if (field === "name") return { ...farm, name: String(raw) };
      if (field === "includeInIndustryAverage") {
        return { ...farm, includeInIndustryAverage: Boolean(raw) };
      }
      const parsed = raw === "" ? null : Number(raw);
      return {
        ...farm,
        [field]: parsed != null && Number.isFinite(parsed) ? parsed : null,
      };
    });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.map((farm, index) => (
        <section
          key={index}
          className="rounded-lg border border-border bg-card p-4"
          aria-label={`Source farm ${index + 1}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Farm {index + 1}</h4>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Remove ${farm.name || `farm ${index + 1}`}`}
              disabled={disabled}
              onClick={() => onChange(value.filter((_, farmIndex) => farmIndex !== index))}
              className="text-muted-foreground"
            >
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
              Remove farm
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor={`benchmark-farm-name-${index}`}
                className="block text-sm font-medium"
              >
                Farm name
              </label>
              <Input
                id={`benchmark-farm-name-${index}`}
                value={farm.name}
                placeholder="Farm name"
                disabled={disabled}
                onChange={(event) => update(index, "name", event.target.value)}
                className="h-10"
              />
            </div>

            <label
              className={`flex items-center gap-2 text-sm sm:self-end sm:pb-2 ${
                !farm.name.trim() || disabled ? "text-muted-foreground/60" : "text-foreground"
              }`}
            >
              <Checkbox
                checked={farm.includeInIndustryAverage}
                disabled={disabled || !farm.name.trim()}
                onCheckedChange={(checked) =>
                  update(index, "includeInIndustryAverage", checked === true)
                }
              />
              Include in industry average
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label
                  htmlFor={`benchmark-farm-${index}-${field.key}`}
                  className="block text-sm font-medium"
                >
                  {field.label}
                </label>
                <Input
                  id={`benchmark-farm-${index}-${field.key}`}
                  type="number"
                  min={0}
                  step={field.step}
                  value={farm[field.key] ?? ""}
                  disabled={disabled || !farm.name.trim()}
                  onChange={(event) => update(index, field.key, event.target.value)}
                  className="h-10"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...value,
            {
              name: "",
              includeInIndustryAverage: false,
              costPerUnit: null,
              manDaysPerUnit: null,
              frequency: null,
            },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        Add source farm
      </Button>
    </div>
  );
}
