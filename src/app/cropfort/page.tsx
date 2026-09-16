import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function CropfortIndexPage() {
  redirect(CROPFORT_ROUTES.dashboard);
}
