/**
 * User account management mock API (SPX admin).
 * Replace each function with admin-users endpoints later.
 * Do not return password hashes or TOTP secrets.
 */
import type { AdminUser, AdminUserInput, AuditEvent } from "@/types/cropfort-modules";
import { listAudit, recordAudit } from "./audit";
import { isoNow, mockDelay, newId } from "./delay";
import { SEED_USERS } from "./seed";

let users: AdminUser[] = structuredClone(SEED_USERS);

const ACTOR = { actorId: "u-pa-1", actorName: "Platform Admin" };

export async function getUsers(): Promise<AdminUser[]> {
  await mockDelay();
  return structuredClone(users);
}

export async function createUser(input: AdminUserInput): Promise<AdminUser> {
  await mockDelay();
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("That email is already registered");
  }
  const created: AdminUser = {
    id: newId("u"),
    name: input.name.trim(),
    email,
    organization: input.organization,
    roles: input.roles,
    tenants: input.tenants,
    status: input.status ?? "invited",
    createdAt: isoNow(),
    lastLoginAt: null,
    neverLoggedIn: true,
  };
  users = [created, ...users];
  recordAudit({
    ...ACTOR,
    action: "user.create",
    entityType: "user",
    entityId: created.id,
    before: null,
    after: created as unknown as Record<string, unknown>,
  });
  // Invite email would be triggered here by the real API.
  return structuredClone(created);
}

export async function updateUser(id: string, input: AdminUserInput): Promise<AdminUser> {
  await mockDelay();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.id !== id && u.email.toLowerCase() === email)) {
    throw new Error("That email is already registered");
  }
  const before = users[idx];
  const updated: AdminUser = {
    ...before,
    name: input.name.trim(),
    email,
    organization: input.organization,
    roles: input.roles,
    tenants: input.tenants,
  };
  users[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "user.update",
    entityType: "user",
    entityId: id,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });
  return structuredClone(updated);
}

export async function suspendUser(id: string): Promise<AdminUser> {
  await mockDelay();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const before = users[idx];
  const updated: AdminUser = { ...before, status: "suspended" };
  users[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "user.suspend",
    entityType: "user",
    entityId: id,
    before: { status: before.status },
    after: { status: "suspended", sessionsRevoked: true },
  });
  return structuredClone(updated);
}

export async function activateUser(id: string): Promise<AdminUser> {
  await mockDelay();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("User not found");
  const before = users[idx];
  const updated: AdminUser = { ...before, status: "active" };
  users[idx] = updated;
  recordAudit({
    ...ACTOR,
    action: "user.activate",
    entityType: "user",
    entityId: id,
    before: { status: before.status },
    after: { status: "active" },
  });
  return structuredClone(updated);
}

export async function revokeUserSessions(id: string): Promise<void> {
  await mockDelay();
  const existing = users.find((u) => u.id === id);
  if (!existing) throw new Error("User not found");
  recordAudit({
    ...ACTOR,
    action: "user.revoke_sessions",
    entityType: "user",
    entityId: id,
    before: null,
    after: { sessionsRevoked: true },
  });
}

export async function deleteUser(id: string): Promise<void> {
  await mockDelay();
  const existing = users.find((u) => u.id === id);
  if (!existing) throw new Error("User not found");
  if (!existing.neverLoggedIn) throw new Error("Only users who have never logged in can be deleted");
  users = users.filter((u) => u.id !== id);
  recordAudit({
    ...ACTOR,
    action: "user.delete",
    entityType: "user",
    entityId: id,
    before: existing as unknown as Record<string, unknown>,
    after: null,
  });
}

export async function getUserAuditTrail(id: string): Promise<AuditEvent[]> {
  await mockDelay(120);
  return listAudit("user", id);
}

export function resetUsersMock(): void {
  users = structuredClone(SEED_USERS);
}
