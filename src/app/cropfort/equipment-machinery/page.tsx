import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function EquipmentMachineryRedirect() {
  redirect(CROPFORT_ROUTES.laborWorkforce);
}
