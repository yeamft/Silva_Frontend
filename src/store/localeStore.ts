import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "am";

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  formatCurrency: (amount: number) => string;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set, get) => ({
      locale: "en",

      setLocale: (locale) => set({ locale }),

      toggleLocale: () =>
        set({ locale: get().locale === "en" ? "am" : "en" }),

      formatCurrency: (amount: number) => {
        const formatted = amount.toLocaleString("en", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        return `Br ${formatted}`;
      },
    }),
    {
      name: "bunalink-locale",
      partialize: (s) => ({ locale: s.locale }),
    }
  )
);
