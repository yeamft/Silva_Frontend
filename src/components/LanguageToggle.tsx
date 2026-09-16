"use client";

import { useLocaleStore } from "@/store/localeStore";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LanguageToggleProps {
  variant?: "default" | "segmented";
}

const LanguageToggle = ({ variant = "default" }: LanguageToggleProps) => {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);

  if (variant === "segmented") {
    return (
      <ToggleGroup
        type="single"
        value={locale}
        onValueChange={(v) => {
          if (v === "en" || v === "am") setLocale(v);
        }}
        className="rounded-full border border-border bg-card p-0.5 shadow-sm"
        aria-label="Toggle language"
      >
        <ToggleGroupItem value="en" aria-label="English" className="h-7 rounded-full px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          EN
        </ToggleGroupItem>
        <ToggleGroupItem value="am" aria-label="Amharic" className="h-7 rounded-full px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          አማ
        </ToggleGroupItem>
      </ToggleGroup>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={toggleLocale}
      aria-label="Toggle language"
      title={locale === "en" ? "Switch to Amharic" : "Switch to English"}
      className="h-9 w-9 text-sm font-semibold"
    >
      {locale === "en" ? "EN" : "አማ"}
    </Button>
  );
};

export default LanguageToggle;
