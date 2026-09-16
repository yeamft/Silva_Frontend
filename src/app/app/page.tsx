import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Legacy Field OS entry — Cropfort modules live under /cropfort. */
export default function AppRoute() {
  redirect(CROPFORT_ROUTES.dashboard);
}
