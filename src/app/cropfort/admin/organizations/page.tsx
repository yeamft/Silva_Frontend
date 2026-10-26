import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";

/** Blocks and organizations are managed from Farm areas now; keep old links working. */
export default function LegacyAdminPage() {
  redirect(CROPFORT_ROUTES.farmAreas);
}
