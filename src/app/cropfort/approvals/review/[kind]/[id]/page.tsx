import { notFound } from "next/navigation";
import ApprovalsView, { type Tab } from "../../../approvals-view";

const APPROVAL_TABS: Tab[] = [
  "afe",
  "afp",
  "projects",
  "interventions",
  "monthly",
  "weekly",
  "rates",
];

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (!APPROVAL_TABS.includes(kind as Tab) || !id) notFound();

  return <ApprovalsView initialSelection={{ kind: kind as Tab, id }} />;
}
