import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function MaterialsInventoryRedirect() {
  redirect(CROPFORT_ROUTES.laborWorkforce);
}
