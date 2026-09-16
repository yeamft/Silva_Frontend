import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
      setDark: (dark) => set({ dark }),
    }),
    {
      name: "spx-farm-os-theme",
      partialize: (s) => ({ dark: s.dark }),
    },
  ),
);
