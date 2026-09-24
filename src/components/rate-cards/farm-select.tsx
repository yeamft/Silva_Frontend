"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFarms } from "@/lib/query";

const STORAGE_KEY = "cropfort-active-farm-id";

export function useActiveFarmId() {
  const farmsQuery = useFarms();
  const farms = farmsQuery.data ?? [];
  const [farmId, setFarmIdState] = useState<string | null>(null);

  useEffect(() => {
    const fromStore = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (fromStore && farms.some((f) => f.id === fromStore)) {
      setFarmIdState(fromStore);
      return;
    }
    if (farms[0]) setFarmIdState(farms[0].id);
  }, [farms]);

  const setFarmId = (id: string) => {
    setFarmIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  return { farmId, setFarmId, farms, loading: farmsQuery.isLoading };
}

export function FarmSelect({
  farmId,
  farms,
  onChange,
}: {
  farmId: string | null;
  farms: Array<{ id: string; name: string }>;
  onChange: (id: string) => void;
}) {
  if (farms.length === 0) {
    return <p className="text-sm text-muted-foreground">No farm estates in this program.</p>;
  }
  return (
    <Select value={farmId || undefined} onValueChange={onChange}>
      <SelectTrigger className="w-[240px]" aria-label="Farm">
        <SelectValue placeholder="Select farm" />
      </SelectTrigger>
      <SelectContent>
        {farms.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
