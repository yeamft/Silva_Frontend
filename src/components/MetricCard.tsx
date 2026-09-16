"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
}

const MetricCard = ({ title, value, change, changeType = "neutral", icon: Icon }: MetricCardProps) => {
  const changeClass =
    changeType === "positive"
      ? "text-success"
      : changeType === "negative"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <p className="cf-numeric mt-2 text-2xl font-semibold leading-none tracking-tight">{value}</p>
        {change ? <p className={cn("mt-2 text-xs font-medium", changeClass)}>{change}</p> : null}
      </CardContent>
    </Card>
  );
};

export default MetricCard;
