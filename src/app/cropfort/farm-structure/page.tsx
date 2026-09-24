import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Demo hierarchy removed — use admin Farm Areas / Blocks / Farm Map. */
export default function FarmStructureRedirect() {
  redirect(CROPFORT_ROUTES.farmAreas);
}
