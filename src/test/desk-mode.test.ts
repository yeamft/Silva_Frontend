import { describe, expect, it } from "vitest";
import { mapToCropfortRole } from "@/lib/api/role-map";
import { canApproveAsAssetOwner, canViewRateCard } from "@/lib/cropfortAccess";
import { getDeskMode } from "@/lib/cropfort/platform-access";

describe("desk mode routing", () => {
  it("maps demo backend roles to the correct shell", () => {
    expect(getDeskMode(mapToCropfortRole("system_admin"))).toBe("spx");
    expect(getDeskMode(mapToCropfortRole("spx_principal"))).toBe("spx");
    expect(getDeskMode(mapToCropfortRole("silva_owner"))).toBe("silva");
    expect(getDeskMode(mapToCropfortRole("vendor_admin"))).toBe("vendor");
    expect(getDeskMode(mapToCropfortRole("vendor_field_lead"))).toBe("vendor");
  });

  it("uses the active program role for scoped asset-owner accounts", () => {
    expect(mapToCropfortRole("spx_principal", ["farm_owner"])).toBe("farm_owner");
    expect(getDeskMode(mapToCropfortRole("spx_principal", ["farm_owner"]))).toBe("silva");
    const viewerRole = mapToCropfortRole("spx_principal", ["farm_owner_viewer"]);
    expect(viewerRole).toBe("farm_owner_viewer");
    expect(getDeskMode(viewerRole)).toBe("silva");
    expect(canViewRateCard(viewerRole)).toBe(true);
    expect(canApproveAsAssetOwner(viewerRole)).toBe(false);
  });
});
