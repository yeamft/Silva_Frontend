/** Client preferences for the select-workspace ops home (per user). */

export type WorkspacePreferences = {
  pinnedProgramIds: string[];
  lastOpenedAtByProgramId: Record<string, number>;
};

const EMPTY: WorkspacePreferences = {
  pinnedProgramIds: [],
  lastOpenedAtByProgramId: {},
};

function storageKey(userId: string) {
  return `cropfort.workspacePrefs.v1.${userId || "anon"}`;
}

export function loadWorkspacePreferences(userId: string): WorkspacePreferences {
  if (typeof window === "undefined") return { ...EMPTY, lastOpenedAtByProgramId: {} };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { pinnedProgramIds: [], lastOpenedAtByProgramId: {} };
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;
    return {
      pinnedProgramIds: Array.isArray(parsed.pinnedProgramIds)
        ? parsed.pinnedProgramIds.filter((id): id is string => typeof id === "string")
        : [],
      lastOpenedAtByProgramId:
        parsed.lastOpenedAtByProgramId && typeof parsed.lastOpenedAtByProgramId === "object"
          ? Object.fromEntries(
              Object.entries(parsed.lastOpenedAtByProgramId).filter(
                ([, v]) => typeof v === "number" && Number.isFinite(v),
              ),
            )
          : {},
    };
  } catch {
    return { pinnedProgramIds: [], lastOpenedAtByProgramId: {} };
  }
}

export function saveWorkspacePreferences(userId: string, prefs: WorkspacePreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function togglePinnedProgram(userId: string, programId: string): WorkspacePreferences {
  const prefs = loadWorkspacePreferences(userId);
  const pinned = prefs.pinnedProgramIds.includes(programId)
    ? prefs.pinnedProgramIds.filter((id) => id !== programId)
    : [programId, ...prefs.pinnedProgramIds];
  const next = { ...prefs, pinnedProgramIds: pinned };
  saveWorkspacePreferences(userId, next);
  return next;
}

export function markProgramOpened(userId: string, programId: string): WorkspacePreferences {
  const prefs = loadWorkspacePreferences(userId);
  const next: WorkspacePreferences = {
    ...prefs,
    lastOpenedAtByProgramId: {
      ...prefs.lastOpenedAtByProgramId,
      [programId]: Date.now(),
    },
  };
  saveWorkspacePreferences(userId, next);
  return next;
}

export function sortProgramsByPreference<T extends { id: string; name: string }>(
  programs: T[],
  prefs: WorkspacePreferences,
): T[] {
  const pinRank = new Map(prefs.pinnedProgramIds.map((id, i) => [id, i]));
  return [...programs].sort((a, b) => {
    const aPin = pinRank.has(a.id) ? pinRank.get(a.id)! : Number.POSITIVE_INFINITY;
    const bPin = pinRank.has(b.id) ? pinRank.get(b.id)! : Number.POSITIVE_INFINITY;
    if (aPin !== bPin) return aPin - bPin;
    const aOpen = prefs.lastOpenedAtByProgramId[a.id] ?? 0;
    const bOpen = prefs.lastOpenedAtByProgramId[b.id] ?? 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function formatRelativeOpened(ts: number | undefined, now = Date.now()): string | null {
  if (!ts || !Number.isFinite(ts)) return null;
  const delta = Math.max(0, now - ts);
  const mins = Math.floor(delta / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
