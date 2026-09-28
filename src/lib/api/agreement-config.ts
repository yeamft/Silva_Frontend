import { apiFetch } from "@/lib/api/http";

export type AgreementConfigDto = {
  programId?: string;
  schedule5: unknown;
  schedule7: unknown;
  processCalendar: unknown;
  reservedMatters: unknown;
  establishment: unknown;
  sixMonthReviews: unknown[];
  directInstructionValueEtb: number;
};

export function getAgreementConfig() {
  return apiFetch<AgreementConfigDto>("/agreement-config");
}

export function putAgreementConfig(body: Partial<AgreementConfigDto>) {
  return apiFetch<AgreementConfigDto>("/agreement-config", {
    method: "PUT",
    body,
  });
}
