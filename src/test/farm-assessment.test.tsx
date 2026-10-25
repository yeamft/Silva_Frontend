import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FarmAssessmentSection } from "@/components/cropfort/farm-assessment";
import * as api from "@/lib/api/farm-assessments";
import type { FarmAssessment } from "@/lib/api/farm-assessments";

vi.mock("@/components/navigation/auth-context", () => ({
  useCropfortAuth: () => ({ activeProgram: { id: "workspace" }, user: { id: "user", name: "Test User" } }),
}));
vi.mock("@/lib/api/farm-assessments", () => ({
  getFarmAssessment: vi.fn(),
  saveFarmAssessment: vi.fn(),
  submitFarmAssessment: vi.fn(),
  decideFarmAssessment: vi.fn(),
  downloadFarmAssessment: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ASSESSMENT_ID = "fa_test-001";

const draft: FarmAssessment = {
  id: ASSESSMENT_ID,
  planId: null,
  farmEstateId: "farm1",
  programId: "workspace",
  planYear: 2026,
  cycleLabel: "2026 Programme",
  title: "Chaka Annual Farm Assessment — 2026 Programme",
  assessmentDate: "2026-10-25",
  assessorName: "Test User",
  assessorUserId: "user",
  assessmentPurpose: "annual_baseline",
  assessedAreaHa: null,
  cropStage: null,
  generalCondition: null,
  findings: "",
  recommendedOps: [],
  blockIds: [],
  reportName: null,
  reportSize: null,
  revision: 0,
  status: "draft",
  returnedComment: null,
  submittedAt: null,
  reviewedAt: null,
  createdAt: "2026-10-25T00:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
  canEdit: true,
  canReview: false,
  history: [],
};

function show(assessment = draft) {
  vi.mocked(api.getFarmAssessment).mockResolvedValue(assessment);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FarmAssessmentSection assessmentId={ASSESSMENT_ID} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("Farm Assessment workflow", () => {
  it("saves findings and a PDF before enabling submission, then locks the submitted draft", async () => {
    show();
    const findings = await screen.findByLabelText("Findings");
    expect(screen.getByRole("button", { name: "Submit to asset owner" })).toBeDisabled();
    fireEvent.change(findings, { target: { value: "Repair irrigation" } });
    const file = new File(["%PDF-1.4 report"], "assessment.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Assessment report"), { target: { files: [file] } });
    const saved: FarmAssessment = {
      ...draft,
      findings: "Repair irrigation",
      reportName: file.name,
      reportSize: file.size,
      revision: 1,
    };
    vi.mocked(api.saveFarmAssessment).mockResolvedValue(saved);
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(api.saveFarmAssessment).toHaveBeenCalledWith(
        ASSESSMENT_ID,
        expect.objectContaining({ findings: "Repair irrigation", revision: 0 }),
        file,
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Submit to asset owner" })).toBeEnabled(),
    );
    vi.mocked(api.submitFarmAssessment).mockResolvedValue({
      ...saved,
      status: "submitted",
      canEdit: false,
      revision: 2,
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit to asset owner" }));
    await screen.findByText("Awaiting asset owner review");
    expect(api.submitFarmAssessment).toHaveBeenCalledWith(ASSESSMENT_ID, 1);
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
  });

  it("requires comments for changes and shows the owner's review history", async () => {
    const submitted: FarmAssessment = {
      ...draft,
      status: "submitted",
      findings: "Findings",
      reportName: "report.pdf",
      revision: 2,
      canEdit: false,
      canReview: true,
    };
    show(submitted);
    const comments = await screen.findByLabelText("Review comments");
    expect(screen.getByRole("button", { name: "Request changes" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    fireEvent.change(comments, { target: { value: "Add soil analysis" } });
    vi.mocked(api.decideFarmAssessment).mockResolvedValue({
      ...submitted,
      status: "changes_requested",
      revision: 3,
      canReview: false,
      returnedComment: "Add soil analysis",
      history: [
        {
          action: "changes_requested",
          comment: "Add soil analysis",
          actorName: "Owner",
          at: "2026-10-25T10:00:00Z",
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));
    await screen.findByText("Review history");
    expect(screen.getAllByText("Add soil analysis").length).toBeGreaterThan(0);
    expect(api.decideFarmAssessment).toHaveBeenCalledWith(
      ASSESSMENT_ID,
      2,
      "request_changes",
      "Add soil analysis",
    );
    expect(screen.getByText("Review history").closest("details")).toHaveAttribute("open");
  });

  it("allows an owner to approve and download the submitted report", async () => {
    const submitted: FarmAssessment = {
      ...draft,
      status: "submitted",
      findings: "Findings",
      reportName: "report.pdf",
      revision: 2,
      canEdit: false,
      canReview: true,
    };
    show(submitted);
    fireEvent.click(await screen.findByRole("button", { name: "Download report" }));
    await waitFor(() =>
      expect(api.downloadFarmAssessment).toHaveBeenCalledWith(ASSESSMENT_ID, "report.pdf"),
    );
    vi.mocked(api.decideFarmAssessment).mockResolvedValue({
      ...submitted,
      status: "approved",
      revision: 3,
      canReview: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve assessment" }));
    await screen.findByText("Approved");
    expect(api.decideFarmAssessment).toHaveBeenCalledWith(ASSESSMENT_ID, 2, "approve", "");
  });

  it("preserves entered findings on a save error and offers reload", async () => {
    show();
    fireEvent.change(await screen.findByLabelText("Findings"), {
      target: { value: "Unsaved findings" },
    });
    vi.mocked(api.saveFarmAssessment).mockRejectedValue(
      new Error("This assessment has changed"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Findings")).toHaveValue("Unsaved findings");
    expect(
      screen.getByRole("button", { name: "Reload saved assessment" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reload saved assessment" }));
    await waitFor(() => expect(screen.getByLabelText("Findings")).toHaveValue(""));
  });

  it("shows returned comment banner when status is changes_requested", async () => {
    const returned: FarmAssessment = {
      ...draft,
      status: "changes_requested",
      findings: "Original findings",
      returnedComment: "Please add soil analysis results",
      canEdit: true,
      canReview: false,
    };
    show(returned);
    await screen.findAllByText("Changes requested");
    expect(screen.getByText("Please add soil analysis results")).toBeInTheDocument();
  });
});
