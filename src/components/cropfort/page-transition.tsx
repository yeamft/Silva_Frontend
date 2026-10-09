"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Soft enter animation on route change — SeamlessHR-style snappy page feel. */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick((n) => n + 1);
  }, [pathname]);

  return (
    <div key={tick} className={cn("cf-page-enter min-h-0 flex-1", className)}>
      {children}
    </div>
  );
}
