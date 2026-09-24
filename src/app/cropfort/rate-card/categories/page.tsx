import { redirect } from "next/navigation";
import { CROPFORT_ROUTES } from "@/config/navigation";

export default function RateCardCategoriesRedirect() {
  redirect(CROPFORT_ROUTES.standingCards);
}
