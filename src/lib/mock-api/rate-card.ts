/**
 * Rate Card mock API.
 * Replace each function with a real fetch to /rate-card later.
 * Tenant is derived from session on the server — never send tenant_id from the client.
 */
import type {
  RateCardCategoryConfig,
  RateCardCategoryInput,
  RateCardLine,
  RateCardLineInput,
  RateCardStatus,
} from "@/types/cropfort-modules";
import { DEFAULT_RATE_CARD_CATEGORIES } from "@/types/cropfort-modules";
import { recordAudit } from "./audit";
import { isoNow, mockDelay, newId } from "./delay";
import { SEED_RATE_CARD } from "./seed";
import { computeVariance } from "./variance";

let lines: RateCardLine[] = structuredClone(SEED_RATE_CARD);

function seedCategories(): RateCardCategoryConfig[] {
  const now = isoNow();
  return DEFAULT_RATE_CARD_CATEGORIES.map((c) => ({
    id: newId("rcc"),
    value: c.value,
    label: c.label,
    active: c.active,
    createdAt: now,
    updatedAt: now,
  }));
}

let categories: RateCardCategoryConfig[] = seedCategories();

const ACTOR = { actorId: "u-sv-1", actorName: "Daniel Okello" };

function slugifyCategory(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function applyVariance(input: RateCardLineInput): Pick<RateCardLine, "variancePct" | "flagged"> {
  return computeVariance(input);
}

function assertActiveCategory(category: string) {
  const found = categories.find((c) => c.value === category && c.active);
  if (!found) {
    throw new Error("Select an active rate category. Configure categories before creating a rate.");
  }
}

export async function getRateCardCategories(): Promise<RateCardCategoryConfig[]> {
  await mockDelay(120);
  return structuredClone(categories).sort((a, b) => a.label.localeCompare(b.label));
}

export async function createRateCardCategory(input: RateCardCategoryInput): Promise<RateCardCategoryConfig> {
  await mockDelay(160);
  const label = input.label.trim();
  if (!label) throw new Error("Category name is required");
  const value = (input.value?.trim() || slugifyCategory(label)).toLowerCase();
  if (!value) throw new Error("Category code is required");
  if (categories.some((c) => c.value === value)) {
    throw new Error("A category with this code already exists");
  }
  if (categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
    throw new Error("A category with this name already exists");
  }
  const now = isoNow();
  const created: RateCardCategoryConfig = {
    id: newId("rcc"),
    value,
    label,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  categories = [...categories, created];
  recordAudit({
    ...ACTOR,
    action: "rate_card.category.create",
    entityType: "rate_card_category",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
}

export async function updateRateCardCategory(
  id: string,
  input: RateCardCategoryInput,
): Promise<RateCardCategoryConfig> {
  await mockDelay(160);
  const idx = categories.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Category not found");
  const before = categories[idx];
  const label = input.label.trim();
  if (!label) throw new Error("Category name is required");
  if (
    categories.some(
      (c) => c.id !== id && c.label.toLowerCase() === label.toLowerCase(),
    )
  ) {
    throw new Error("A category with this name already exists");
  }
  const updated: RateCardCategoryConfig = {
    ...before,
    label,
    active: input.active ?? before.active,
    updatedAt: isoNow(),
  };
  categories[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "rate_card.category.update",
    entityType: "rate_card_category",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteRateCardCategory(id: string): Promise<void> {
  await mockDelay(160);
  const existing = categories.find((c) => c.id === id);
  if (!existing) throw new Error("Category not found");
  const inUse = lines.some((l) => l.category === existing.value);
  if (inUse) {
    throw new Error("Category is used by rate lines. Deactivate it instead of deleting.");
  }
  categories = categories.filter((c) => c.id !== id);
  recordAudit({
    ...ACTOR,
    action: "rate_card.category.delete",
    entityType: "rate_card_category",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getRateCardLines(): Promise<RateCardLine[]> {
  await mockDelay();
  return structuredClone(lines);
}

export async function createRateCardLine(input: RateCardLineInput): Promise<RateCardLine> {
  await mockDelay();
  assertActiveCategory(input.category);
  const now = isoNow();
  const created: RateCardLine = {
    ...input,
    id: newId("rc"),
    status: input.status ?? "draft",
    ...applyVariance(input),
    createdAt: now,
    updatedAt: now,
  };
  lines = [created, ...lines];
  recordAudit({
    ...ACTOR,
    action: "rate_card.create",
    entityType: "rate_card_line",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  return structuredClone(created);
}

export async function updateRateCardLine(id: string, input: RateCardLineInput): Promise<RateCardLine> {
  await mockDelay();
  assertActiveCategory(input.category);
  const idx = lines.findIndex((l) => l.id === id);
  if (idx < 0) throw new Error("Rate card line not found");
  const before = lines[idx];
  if (before.status === "approved" || before.status === "submitted") {
    throw new Error("Only draft or returned lines can be edited");
  }
  const updated: RateCardLine = {
    ...before,
    ...input,
    id: before.id,
    status: before.status === "returned" ? "draft" : before.status,
    ...applyVariance(input),
    createdAt: before.createdAt,
    updatedAt: isoNow(),
  };
  lines[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "rate_card.update",
    entityType: "rate_card_line",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function deleteRateCardLine(id: string): Promise<void> {
  await mockDelay();
  const existing = lines.find((l) => l.id === id);
  if (!existing) throw new Error("Rate card line not found");
  if (existing.status !== "draft") throw new Error("Only draft lines can be deleted");
  lines = lines.filter((l) => l.id !== id);
  recordAudit({
    ...ACTOR,
    action: "rate_card.delete",
    entityType: "rate_card_line",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function submitRateCardLines(): Promise<{ submitted: number }> {
  await mockDelay();
  const drafts = lines.filter((l) => l.status === "draft");
  if (drafts.length === 0) throw new Error("No draft lines to submit");
  const missing = drafts.filter((l) => l.flagged && !l.justificationNote.trim());
  if (missing.length > 0) {
    throw new Error("Flagged draft lines require an SPX justification note");
  }
  const now = isoNow();
  lines = lines.map((l) => (l.status === "draft" ? { ...l, status: "submitted" as RateCardStatus, updatedAt: now } : l));
  recordAudit({
    ...ACTOR,
    action: "rate_card.submit",
    entityType: "rate_card_batch",
    entityId: "batch",
    before: { ids: drafts.map((d) => d.id) },
    after: { submitted: drafts.length },
  });
  return { submitted: drafts.length };
}

export async function approveRateCardLine(id: string): Promise<RateCardLine> {
  await mockDelay();
  const idx = lines.findIndex((l) => l.id === id);
  if (idx < 0) throw new Error("Rate card line not found");
  const before = lines[idx];
  if (before.status !== "submitted") throw new Error("Only submitted lines can be approved");
  const updated: RateCardLine = { ...before, status: "approved", updatedAt: isoNow() };
  lines[idx] = updated;
  recordAudit({
    actorId: "u-fo-1",
    actorName: "Helena Silva",
    action: "rate_card.approve",
    entityType: "rate_card_line",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function returnRateCardLine(id: string, comment: string): Promise<RateCardLine> {
  await mockDelay();
  if (!comment.trim()) throw new Error("A decision comment is required to return a line");
  const idx = lines.findIndex((l) => l.id === id);
  if (idx < 0) throw new Error("Rate card line not found");
  const before = lines[idx];
  if (before.status !== "submitted") throw new Error("Only submitted lines can be returned");
  const updated: RateCardLine = { ...before, status: "returned", updatedAt: isoNow() };
  lines[idx] = updated;
  recordAudit({
    actorId: "u-fo-1",
    actorName: "Helena Silva",
    action: "rate_card.return",
    entityType: "rate_card_line",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: { ...updated, decisionComment: comment } as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export function getRateCardSummary(source = lines) {
  return {
    total: source.length,
    draft: source.filter((l) => l.status === "draft").length,
    submitted: source.filter((l) => l.status === "submitted").length,
    approved: source.filter((l) => l.status === "approved").length,
    returned: source.filter((l) => l.status === "returned").length,
    flagged: source.filter((l) => l.flagged).length,
  };
}

export function resetRateCardMock(): void {
  lines = structuredClone(SEED_RATE_CARD);
  categories = seedCategories();
}
