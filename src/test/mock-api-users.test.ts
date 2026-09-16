import { beforeEach, describe, expect, it } from "vitest";
import { resetAudit } from "@/lib/mock-api/audit";
import {
  createUser,
  deleteUser,
  getUsers,
  resetUsersMock,
  suspendUser,
  updateUser,
} from "@/lib/mock-api/users";

describe("users mock API", () => {
  beforeEach(() => {
    resetUsersMock();
    resetAudit();
  });

  it("rejects duplicate emails", async () => {
    await expect(
      createUser({
        name: "Copy",
        email: "daniel@spx.example",
        organization: "spx",
        status: "invited",
        roles: ["spx_validator"],
        tenants: [{ tenantId: "tenant-shecha", tenantName: "Shecha Estate", roles: ["spx_validator"], blockIds: [] }],
      })
    ).rejects.toThrow(/already registered/i);
  });

  it("creates an invited user and updates assignments", async () => {
    const created = await createUser({
      name: "New Supervisor",
      email: "new.fs@bagro.example",
      organization: "bagro",
      status: "invited",
      roles: ["field_supervisor"],
      tenants: [
        {
          tenantId: "tenant-shecha",
          tenantName: "Shecha Estate",
          roles: ["field_supervisor"],
          blockIds: ["blk-a1"],
        },
      ],
    });
    expect(created.status).toBe("invited");
    expect(created.neverLoggedIn).toBe(true);

    const updated = await updateUser(created.id, {
      name: "New Supervisor",
      email: "new.fs@bagro.example",
      organization: "bagro",
      status: "invited",
      roles: ["field_supervisor", "bagro_office"],
      tenants: created.tenants,
    });
    expect(updated.roles).toContain("bagro_office");
  });

  it("suspends a user and only deletes never-logged-in accounts", async () => {
    const active = (await getUsers()).find((u) => !u.neverLoggedIn)!;
    const suspended = await suspendUser(active.id);
    expect(suspended.status).toBe("suspended");
    await expect(deleteUser(active.id)).rejects.toThrow(/never logged in/i);

    const invited = (await getUsers()).find((u) => u.neverLoggedIn)!;
    await deleteUser(invited.id);
    const remaining = await getUsers();
    expect(remaining.some((u) => u.id === invited.id)).toBe(false);
  });
});
