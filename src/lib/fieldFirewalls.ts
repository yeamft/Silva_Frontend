import type { FieldUserRole, OrgKind } from "@/types/fieldOs";

/** Structural firewalls — UI + future API must share these rules. */

export function canSeeRawFieldTickets(role: FieldUserRole): boolean {
  return role === "spx_principal" || role === "vendor_lead";
}

export function canSeePaymentRequests(role: FieldUserRole): boolean {
  return role === "spx_principal" || role === "vendor_lead";
}

export function canSeeSpxRevenue(role: FieldUserRole): boolean {
  return role === "spx_principal";
}

export function canApproveAfp(role: FieldUserRole): boolean {
  return role === "silva_owner";
}

export function canApproveBandCd(role: FieldUserRole): boolean {
  return role === "silva_owner";
}

export function canIssueInstruments(role: FieldUserRole): boolean {
  return role === "spx_principal";
}

export function canValidateWork(role: FieldUserRole): boolean {
  return role === "spx_principal";
}

export function canSubmitFieldWork(role: FieldUserRole): boolean {
  return role === "vendor_lead";
}

export function canSeeSettlements(role: FieldUserRole): boolean {
  return role === "silva_owner" || role === "spx_principal";
}

export function orgKindForRole(role: FieldUserRole): OrgKind {
  if (role === "silva_owner") return "silva";
  if (role === "spx_principal") return "spx";
  return "vendor";
}
