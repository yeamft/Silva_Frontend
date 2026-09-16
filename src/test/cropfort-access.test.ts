import { describe, expect, it } from "vitest";
import {
  canDecideRateCard,
  canEditRateCard,
  canManageOrgMap,
  canManageUsers,
  canViewOrgMap,
  canViewRateCard,
} from "@/lib/cropfortAccess";
import type { CropfortRole } from "@/types/cropfort";

const ALL: CropfortRole[] = [
  "field_supervisor",
  "bagro_office",
  "spx_validator",
  "farm_owner",
  "spx_platform_admin",
];

describe("cropfort UI access helpers", () => {
  it("shows rate card to validator, owner, and platform admin only", () => {
    expect(ALL.filter(canViewRateCard)).toEqual(["spx_validator", "farm_owner", "spx_platform_admin"]);
  });

  it("lets validators and admins edit; owners decide", () => {
    expect(canEditRateCard("spx_validator")).toBe(true);
    expect(canEditRateCard("farm_owner")).toBe(false);
    expect(canDecideRateCard("farm_owner")).toBe(true);
    expect(canDecideRateCard("spx_validator")).toBe(false);
  });

  it("restricts user management to platform admin", () => {
    expect(ALL.filter(canManageUsers)).toEqual(["spx_platform_admin"]);
  });

  it("lets validators read the org map but not edit", () => {
    expect(canViewOrgMap("spx_validator")).toBe(true);
    expect(canManageOrgMap("spx_validator")).toBe(false);
    expect(canManageOrgMap("spx_platform_admin")).toBe(true);
    expect(canViewOrgMap("bagro_office")).toBe(false);
    expect(canViewOrgMap("farm_owner")).toBe(false);
    expect(canViewOrgMap("field_supervisor")).toBe(false);
  });
});
