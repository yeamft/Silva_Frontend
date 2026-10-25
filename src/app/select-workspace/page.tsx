import { redirect } from "next/navigation";
import { WORKSPACE_HOME_PATH } from "@/lib/workspace-gate";

export default function SelectWorkspacePage() {
  redirect(WORKSPACE_HOME_PATH);
}
