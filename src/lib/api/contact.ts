import { apiFetch } from "./http";

export type ContactInquiryInput = {
  name: string;
  email: string;
  organization?: string;
  message: string;
  website?: string;
};

export async function submitContactInquiry(input: ContactInquiryInput) {
  return apiFetch<{ ok: boolean; delivered?: boolean }>("/contact", {
    auth: false,
    method: "POST",
    body: input,
  });
}
