import { describe, expect, it } from "vitest";
import {
  activeWorkspacePrograms,
  canChooseWorkspace,
  planWorkspaceEntry,
  shouldAutoEnterSingleWorkspace,
} from "@/lib/workspace-gate";

describe("workspace gate", () => {
  it("filters archived programmes from workspace lists", () => {
    const programs = [
      { id: "a", status: "active" },
      { id: "b", status: "archived" },
      { id: "c", status: "Active" },
    ];
    expect(activeWorkspacePrograms(programs).map((p) => p.id)).toEqual(["a", "c"]);
  });

  it("auto-enters when exactly one active workspace", () => {
    expect(shouldAutoEnterSingleWorkspace(1)).toBe(true);
    expect(shouldAutoEnterSingleWorkspace(0)).toBe(false);
    expect(shouldAutoEnterSingleWorkspace(2)).toBe(false);
  });

  it("shows switcher only when multiple workspaces exist", () => {
    expect(canChooseWorkspace("farm_owner", 1)).toBe(false);
    expect(canChooseWorkspace("spx_validator", 2)).toBe(true);
  });

  it("plans auto-enter when one workspace and not yet active", () => {
    expect(
      planWorkspaceEntry({
        programs: [{ id: "p1", status: "active" }],
        activeProgramId: null,
      }),
    ).toEqual({ action: "auto", programId: "p1" });
  });

  it("plans home when single workspace already active", () => {
    expect(
      planWorkspaceEntry({
        programs: [{ id: "p1", status: "active" }],
        activeProgramId: "p1",
      }),
    ).toEqual({ action: "home" });
  });

  it("plans picker when multiple workspaces", () => {
    expect(
      planWorkspaceEntry({
        programs: [
          { id: "p1", status: "active" },
          { id: "p2", status: "active" },
        ],
        activeProgramId: "p1",
      }),
    ).toEqual({ action: "pick" });
  });

  it("ignores archived programmes when planning entry", () => {
    expect(
      planWorkspaceEntry({
        programs: [
          { id: "p1", status: "archived" },
          { id: "p2", status: "active" },
        ],
        activeProgramId: null,
      }),
    ).toEqual({ action: "auto", programId: "p2" });
  });
});
