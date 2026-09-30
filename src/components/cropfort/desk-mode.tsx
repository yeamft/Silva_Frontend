"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  getDeskMode,
  type DeskMode,
} from "@/lib/cropfort/platform-access";
import type { CropfortRole } from "@/types/cropfort";

const DeskModeContext = createContext<DeskMode>("spx");

export function DeskModeProvider({
  role,
  children,
}: {
  role: CropfortRole | string;
  children: ReactNode;
}) {
  return (
    <DeskModeContext.Provider value={getDeskMode(role)}>
      {children}
    </DeskModeContext.Provider>
  );
}

export function useDeskMode(): DeskMode {
  return useContext(DeskModeContext);
}

export function useIsSpxDesk() {
  return useDeskMode() === "spx";
}

export function useIsVendorDesk() {
  return useDeskMode() === "vendor";
}

export function useIsSilvaDesk() {
  return useDeskMode() === "silva";
}
