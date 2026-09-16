"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function MultiCheck({
  legend,
  options,
  values,
  onChange,
  error,
  disabled,
}: {
  legend: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const toggle = (value: string, checked: boolean) => {
    onChange(checked ? [...values, value] : values.filter((v) => v !== value));
  };

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {options.map((opt) => {
          const checked = values.includes(opt.value);
          const id = `mc-${legend}-${opt.value}`.replace(/\s+/g, "-").toLowerCase();
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                checked ? "border-primary/40 bg-primary/5" : "border-border"
              )}
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => toggle(opt.value, v === true)}
                disabled={disabled}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}
