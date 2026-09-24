"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  createUser,
  deleteUser,
  getUserAuditTrail,
  getUsers,
  getUsersMeta,
  revokeUserSessions,
  suspendUser,
  updateUser,
} from "@/lib/api/users";
import type { AdminUserInput } from "@/types/cropfort-modules";
import { queryKeys } from "@/lib/query/keys";

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: getUsers,
    enabled,
  });
}

export function useUsersMeta(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.meta(),
    queryFn: getUsersMeta,
    enabled,
  });
}

export function useUserAuditTrail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.audit(id || ""),
    queryFn: () => getUserAuditTrail(id!),
    enabled: Boolean(id) && enabled,
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.users.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: AdminUserInput) => createUser(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserInput }) => updateUser(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useSuspendUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => suspendUser(id),
    onSuccess: () => invalidate(),
  });
}

export function useActivateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => activateUser(id),
    onSuccess: () => invalidate(),
  });
}

export function useRevokeUserSessions() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => revokeUserSessions(id),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => invalidate(),
  });
}
