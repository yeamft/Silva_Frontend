import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function RateCardLegacyRedirect() {
  redirect(CROPFORT_ROUTES.standingCards);
}
