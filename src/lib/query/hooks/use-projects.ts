"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  decideProject,
  linkProjectAfe,
  listProjects,
  startProject,
  submitProject,
  toggleProjectMilestone,
} from "@/lib/api/projects";
import { queryKeys } from "@/lib/query/keys";

export function useProjects(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.projects.list(status),
    queryFn: () => listProjects(status ? { status } : undefined),
    enabled,
  });
}

function useInvalidateProjects() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.projects.all });
  };
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => invalidate(),
  });
}

export function useSubmitProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: string) => submitProject(id),
    onSuccess: () => invalidate(),
  });
}

export function useDecideProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: "approve" | "return";
      comment?: string;
    }) => decideProject(id, decision, comment),
    onSuccess: () => invalidate(),
  });
}

export function useStartProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: string) => startProject(id),
    onSuccess: () => invalidate(),
  });
}

export function useToggleProjectMilestone() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ id, milestoneId }: { id: string; milestoneId: string }) =>
      toggleProjectMilestone(id, milestoneId),
    onSuccess: () => invalidate(),
  });
}

export function useLinkProjectAfe() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ id, cropfortAfeId }: { id: string; cropfortAfeId: string }) =>
      linkProjectAfe(id, cropfortAfeId),
    onSuccess: () => invalidate(),
  });
}
