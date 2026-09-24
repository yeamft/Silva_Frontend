import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Standing catalog lives on Rate cards (approved). */
export default function StandingCardsRedirect() {
  redirect(CROPFORT_ROUTES.rateCardProposals);
}
