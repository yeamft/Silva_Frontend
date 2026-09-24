import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function RateCardArchiveRedirect() {
  redirect(CROPFORT_ROUTES.rateCardArchive);
}
