/**
 * Commercial firewalls — CropFort CONTROL payment / settlement.
 * Vendor never reaches Silva raw; Silva never sees draft PRs/tickets.
 */
import type { CropfortRole } from "@/types/cropfort";
import { isBagroDesk, isSilvaDesk, isSpxDesk } from "@/lib/cropfort/platform-access";

/** Create / submit PR from validated tickets (vendor + SPX support). */
export function canCreatePaymentRequest(role: CropfortRole | string): boolean {
  return isBagroDesk(role) || isSpxDesk(role);
}

/** SPX verifies submitted PRs. */
export function canVerifyPaymentRequest(role: CropfortRole | string): boolean {
  return isSpxDesk(role);
}

/** See PR register (vendor own desk + SPX). Silva excluded from raw PRs. */
export function canSeePaymentRequests(role: CropfortRole | string): boolean {
  return isBagroDesk(role) || isSpxDesk(role);
}

/** SPX authorizes settlement release to Silva. */
export function canAuthorizeSettlement(role: CropfortRole | string): boolean {
  return isSpxDesk(role);
}

/** Silva + SPX see settlements; Silva only authorized/settled (enforced in store filter). */
export function canSeeSettlements(role: CropfortRole | string): boolean {
  return isSilvaDesk(role) || isSpxDesk(role);
}

/** Silva must not receive raw ticket / draft PR fields. */
export function silvaMaySeeSettlement(status: string): boolean {
  return status === "authorized" || status === "settled";
}
