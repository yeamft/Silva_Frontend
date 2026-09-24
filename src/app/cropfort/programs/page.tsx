import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Ops hub removed — Programs live only in the admin register. */
export default function ProgramsWorkspaceRedirect() {
  redirect(CROPFORT_ROUTES.programs);
}
