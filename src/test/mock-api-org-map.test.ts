import { beforeEach, describe, expect, it } from "vitest";
import { resetAudit } from "@/lib/mock-api/audit";
import {
  createFarmArea,
  createOrganization,
  createVendor,
  deleteOrganization,
  deleteVendor,
  getFarmMapOverview,
  resetOrgMapMock,
} from "@/lib/mock-api/org-map";

describe("org map mock API", () => {
  beforeEach(() => {
    resetOrgMapMock();
    resetAudit();
  });

  it("builds a farm map overview with relationships", async () => {
    const rows = await getFarmMapOverview();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const shecha = rows.find((r) => r.farmAreaName === "Shecha Estate");
    expect(shecha?.organizationName).toBe("Silva Estate Holdings");
    expect(shecha?.primaryVendors.length).toBeGreaterThan(0);
    expect(shecha?.assetOwners.length).toBeGreaterThan(0);
  });

  it("creates organizations and farm areas with an owning org", async () => {
    const org = await createOrganization({ name: "Test Estate Co", type: "silva_estate", status: "active" });
    const area = await createFarmArea({
      name: "Test Plot",
      organizationId: org.id,
      totalHectares: 12,
      status: "active",
      blockIds: [],
      vendorIds: [],
      assetOwnerIds: [],
    });
    expect(area.organizationId).toBe(org.id);
  });

  it("rejects vendor create without farm area or block, and blocks org delete when referenced", async () => {
    await expect(
      createVendor({
        name: "Orphan Vendor",
        category: "Other",
        status: "pending",
        prequalified: false,
        insuranceOnFile: false,
        farmAreaIds: [],
        blockIds: [],
      })
    ).rejects.toThrow(/farm area or block/i);

    await expect(deleteOrganization("org-silva")).rejects.toThrow(/farm areas/i);
  });

  it("prevents deleting a vendor still listed on a farm area", async () => {
    await expect(deleteVendor("vnd-bagro")).rejects.toThrow(/unlink/i);
  });
});
