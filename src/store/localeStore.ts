import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en";

interface LocaleStore {
  locale: Locale;
  formatCurrency: (amount: number) => string;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    () => ({
      locale: "en",

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
      partialize: () => ({ locale: "en" as const }),
      version: 1,
      migrate: () => ({ locale: "en" as const }),
    }
  )
);
