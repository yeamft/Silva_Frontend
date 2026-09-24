import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  rateCardStatusFilter: string;
  setRateCardStatusFilter: (v: string) => void;
  catalogSearch: string;
  setCatalogSearch: (v: string) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      rateCardStatusFilter: "all",
      setRateCardStatusFilter: (rateCardStatusFilter) => set({ rateCardStatusFilter }),
      catalogSearch: "",
      setCatalogSearch: (catalogSearch) => set({ catalogSearch }),
    }),
    { name: "cropfort-ui" },
  ),
);
