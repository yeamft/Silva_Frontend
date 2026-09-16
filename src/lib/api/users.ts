import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";
import type {
  AdminUser,
  AdminUserInput,
  AuditEvent,
} from "@/types/cropfort-modules";

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

export type UsersMeta = {
  programs: { tenantId: string; tenantName: string }[];
  blocks: { id: string; code: string; name: string; programId: string }[];
};

export async function getUsers(): Promise<AdminUser[]> {
  try {
    return await apiFetch<AdminUser[]>("/users");
  } catch (err) {
    throw asError(err);
  }
}

export async function getUsersMeta(): Promise<UsersMeta> {
  try {
    return await apiFetch<UsersMeta>("/users/meta");
  } catch (err) {
    throw asError(err);
  }
}

export async function createUser(
  input: AdminUserInput,
): Promise<{ user: AdminUser; temporaryPassword?: string }> {
  try {
    return await apiFetch<{ user: AdminUser; temporaryPassword?: string }>("/users", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function updateUser(id: string, input: AdminUserInput): Promise<AdminUser> {
  try {
    return await apiFetch<AdminUser>(`/users/${id}`, {
      method: "PATCH",
      body: input,
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function suspendUser(id: string): Promise<AdminUser> {
  try {
    return await apiFetch<AdminUser>(`/users/${id}/suspend`, { method: "POST", body: {} });
  } catch (err) {
    throw asError(err);
  }
}

export async function activateUser(id: string): Promise<AdminUser> {
  try {
    return await apiFetch<AdminUser>(`/users/${id}/activate`, { method: "POST", body: {} });
  } catch (err) {
    throw asError(err);
  }
}

export async function revokeUserSessions(id: string): Promise<void> {
  try {
    await apiFetch(`/users/${id}/revoke-sessions`, { method: "POST", body: {} });
  } catch (err) {
    throw asError(err);
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await apiFetch(`/users/${id}`, { method: "DELETE" });
  } catch (err) {
    throw asError(err);
  }
}

export async function getUserAuditTrail(id: string): Promise<AuditEvent[]> {
  try {
    return await apiFetch<AuditEvent[]>(`/users/${id}/audit`);
  } catch (err) {
    throw asError(err);
  }
}
