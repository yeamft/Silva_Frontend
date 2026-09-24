import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

/** Legacy period rate card detail removed. */
export default function RateCardDetailRedirect() {
  redirect(CROPFORT_ROUTES.standingCards);
}
