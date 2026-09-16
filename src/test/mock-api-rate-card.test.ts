import { beforeEach, describe, expect, it } from "vitest";
import { formatBirr } from "@/lib/formatBirr";
import { resetAudit } from "@/lib/mock-api/audit";
import {
  approveRateCardLine,
  createRateCardCategory,
  createRateCardLine,
  getRateCardCategories,
  getRateCardLines,
  resetRateCardMock,
  returnRateCardLine,
  submitRateCardLines,
  updateRateCardLine,
} from "@/lib/mock-api/rate-card";
import { VARIANCE_FLAG_THRESHOLD_PCT, computeVariance } from "@/lib/mock-api/variance";

describe("formatBirr", () => {
  it("formats with thousands separator, two decimals, and Birr suffix", () => {
    expect(formatBirr(1_000_000)).toBe("1,000,000.00 Birr");
  });
});

describe("rate card mock API", () => {
  beforeEach(() => {
    resetRateCardMock();
    resetAudit();
  });

  it("flags variance above the preview threshold", () => {
    const result = computeVariance({
      rateBirr: 150,
      benchmarkFarmARate: 100,
      benchmarkFarmBRate: 100,
    });
    expect(result.flagged).toBe(true);
    expect(result.variancePct).toBeGreaterThan(VARIANCE_FLAG_THRESHOLD_PCT);
  });

  it("creates a draft line and requires justification on flagged submit", async () => {
    await createRateCardLine({
      resourceCode: "LAB-TEST",
      resourceName: "Test labour",
      category: "labour",
      unitOfMeasure: "day",
      rateBirr: 2000,
      benchmarkFarmARate: 1000,
      benchmarkFarmBRate: 1000,
      justificationNote: "",
      budgetYear: 2025,
      effectiveFrom: null,
      effectiveTo: null,
    });

    await expect(submitRateCardLines()).rejects.toThrow(/justification/i);
  });

  it("submits drafts when flagged lines have notes, then owner can approve or return", async () => {
    const created = await createRateCardLine({
      resourceCode: "MAT-TEST",
      resourceName: "Test material",
      category: "material",
      unitOfMeasure: "kg",
      rateBirr: 10,
      benchmarkFarmARate: 10,
      benchmarkFarmBRate: 10,
      justificationNote: "",
      budgetYear: 2025,
      effectiveFrom: null,
      effectiveTo: null,
    });

    const flagged = (await getRateCardLines()).filter((l) => l.status === "draft" && l.flagged);
    for (const line of flagged) {
      await updateRateCardLine(line.id, {
        resourceCode: line.resourceCode,
        resourceName: line.resourceName,
        category: line.category,
        unitOfMeasure: line.unitOfMeasure,
        rateBirr: line.rateBirr,
        benchmarkFarmARate: line.benchmarkFarmARate,
        benchmarkFarmBRate: line.benchmarkFarmBRate,
        justificationNote: "Quoted shortage — three suppliers.",
        budgetYear: line.budgetYear,
        effectiveFrom: line.effectiveFrom,
        effectiveTo: line.effectiveTo,
      });
    }

    const { submitted } = await submitRateCardLines();
    expect(submitted).toBeGreaterThan(0);

    const after = await getRateCardLines();
    expect(after.find((l) => l.id === created.id)?.status).toBe("submitted");

    const approved = await approveRateCardLine(created.id);
    expect(approved.status).toBe("approved");

    const other = after.find((l) => l.id !== created.id && l.status === "submitted");
    if (other) {
      const returned = await returnRateCardLine(other.id, "Rate is too high for this season.");
      expect(returned.status).toBe("returned");
    }
  });

  it("requires a comment to return a line", async () => {
    const submitted = (await getRateCardLines()).find((l) => l.status === "submitted");
    expect(submitted).toBeTruthy();
    await expect(returnRateCardLine(submitted!.id, "  ")).rejects.toThrow(/comment/i);
  });

  it("lets tenants configure categories before creating rates", async () => {
    const created = await createRateCardCategory({ label: "Irrigation" });
    expect(created.value).toBe("irrigation");
    const list = await getRateCardCategories();
    expect(list.some((c) => c.value === "irrigation")).toBe(true);

    const line = await createRateCardLine({
      resourceCode: "IRR-1",
      resourceName: "Drip kit day",
      category: "irrigation",
      unitOfMeasure: "day",
      rateBirr: 500,
      benchmarkFarmARate: null,
      benchmarkFarmBRate: null,
      justificationNote: "",
      budgetYear: 2025,
      effectiveFrom: null,
      effectiveTo: null,
    });
    expect(line.category).toBe("irrigation");

    await expect(
      createRateCardLine({
        resourceCode: "X-1",
        resourceName: "Bad",
        category: "not-a-category",
        unitOfMeasure: "day",
        rateBirr: 1,
        benchmarkFarmARate: null,
        benchmarkFarmBRate: null,
        justificationNote: "",
        budgetYear: 2025,
        effectiveFrom: null,
        effectiveTo: null,
      }),
    ).rejects.toThrow(/categor/i);
  });

  it("archives and restores rates by budget year for reference", async () => {
    const { archiveRateCardYear, unarchiveRateCardYear, getRateCardBudgetYears } = await import(
      "@/lib/mock-api/rate-card"
    );
    const result = await archiveRateCardYear(2025);
    expect(result.archived).toBeGreaterThan(0);
    const archived = await getRateCardLines({ budgetYear: 2025, archived: "archived" });
    expect(archived.length).toBe(result.archived);
    expect(archived.every((l) => l.archivedAt)).toBe(true);

    const restored = await unarchiveRateCardYear(2025);
    expect(restored.restored).toBe(result.archived);
    const active = await getRateCardLines({ budgetYear: 2025, archived: "active" });
    expect(active.length).toBeGreaterThan(0);

    const years = await getRateCardBudgetYears();
    expect(years.some((y) => y.budgetYear === 2025)).toBe(true);
  });
});
