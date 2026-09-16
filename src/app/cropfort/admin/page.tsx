import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function AdminIndexPage() {
  redirect(CROPFORT_ROUTES.farmMap);
}
