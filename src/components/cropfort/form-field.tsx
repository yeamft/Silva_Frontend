"use client";

import { AlertCircle } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + helper/error text with the wiring done once.
 * `render` receives the ids it must spread onto the control.
 */
export function FormField({
  label,
  helper,
  error,
  required,
  optional,
  className,
  render,
}: {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  render: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
  }) => ReactNode;
}) {
  const id = useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {label}
          {required ? (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        {optional ? <span className="text-xs text-muted-foreground">Optional</span> : null}
      </div>

      {render({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}

      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Groups related fields with an optional section title inside a form. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? (
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
