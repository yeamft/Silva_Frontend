/** Rule Book 04 — KPI / variance miss attribution codes. */

export type MissCause =
  | "spx"
  | "chaka_buna"
  | "bagro"
  | "silva_late"
  | "owner_direction"
  | "excluded_deliverable"
  | "outside_control";

export const MISS_CAUSE_LABELS: Record<MissCause, string> = {
  spx: "SPX",
  chaka_buna: "Chaka Buna",
  bagro: "B-Agro",
  silva_late: "Late Silva decision",
  owner_direction: "Owner Direction",
  excluded_deliverable: "Excluded Deliverable",
  outside_control: "Outside anyone's control",
};

export const MISS_CAUSE_OPTIONS = Object.entries(MISS_CAUSE_LABELS).map(
  ([value, label]) => ({ value: value as MissCause, label }),
);

export function missCauseLabel(code: MissCause | null | undefined): string {
  if (!code) return "—";
  return MISS_CAUSE_LABELS[code] ?? code;
}
