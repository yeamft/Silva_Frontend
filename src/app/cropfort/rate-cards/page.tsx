import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Rate cards hub → proposals (create from benchmark → Silva → standing). */
export default function RateCardsIndexRedirect() {
  redirect(CROPFORT_ROUTES.rateCardProposals);
}
