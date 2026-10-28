"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { budgetYearLabel } from "@/lib/cropfort/ethiopian-year";
import { cn } from "@/lib/utils";

const PAGE = 12;

type Props = {
  id?: string;
  /** Gregorian year the budget year ends in (the plan's planYear). */
  value: number;
  onChange: (year: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
};

/** Calendar-style budget year picker: a page of twelve years, any year in range. */
export function BudgetYearPicker({ id, value, onChange, min = 2000, max = 2100, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const pageStart = (y: number) => Math.max(min, Math.min(y - (y % PAGE), max - PAGE + 1));
  const [start, setStart] = useState(() => pageStart(value));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: PAGE }, (_, i) => start + i).filter((y) => y >= min && y <= max);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setStart(pageStart(value));
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled} className="h-11 w-full justify-between rounded-xl border-border/80 bg-background text-[15px] font-normal shadow-sm">
          <span className="truncate">{budgetYearLabel(value).label}</span>
          <CalendarDays className="ml-2 h-4 w-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Earlier years"
            disabled={start <= min}
            onClick={() => setStart((s) => Math.max(min, s - PAGE))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-medium tabular-nums">
            {years[0]} – {years[years.length - 1]}
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Later years"
            disabled={start + PAGE > max}
            onClick={() => setStart((s) => Math.min(max - PAGE + 1, s + PAGE))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5" role="listbox" aria-label="Budget year">
          {years.map((y) => {
            const selected = y === value;
            return (
              <button
                key={y}
                type="button"
                role="option"
                aria-selected={selected}
                title={budgetYearLabel(y).label}
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
                className={cn(
                  "cf-focus flex flex-col items-center rounded-md border px-1 py-1.5 text-sm tabular-nums transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : y === thisYear
                      ? "border-primary/40 hover:bg-muted"
                      : "border-transparent hover:bg-muted",
                )}
              >
                <span className="font-medium">{y}</span>
                <span className={cn("text-[10px]", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {budgetYearLabel(y).ec}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          The year shown is the Gregorian year the budget year ends in.
        </p>
      </PopoverContent>
    </Popover>
  );
}
