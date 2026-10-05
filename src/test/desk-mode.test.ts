import { describe, expect, it } from "vitest";
import { mapToCropfortRole } from "@/lib/api/role-map";
import { getDeskMode } from "@/lib/cropfort/platform-access";

describe("desk mode routing", () => {
  it("maps demo backend roles to the correct shell", () => {
    expect(getDeskMode(mapToCropfortRole("system_admin"))).toBe("spx");
    expect(getDeskMode(mapToCropfortRole("spx_principal"))).toBe("spx");
    expect(getDeskMode(mapToCropfortRole("silva_owner"))).toBe("silva");
    expect(getDeskMode(mapToCropfortRole("vendor_admin"))).toBe("vendor");
    expect(getDeskMode(mapToCropfortRole("vendor_field_lead"))).toBe("vendor");
  });
});
