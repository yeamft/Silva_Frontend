export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown[];

  constructor(status: number, code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationType: string | null;
  organizationId: string;
  activeProgramId: string | null;
  active: boolean;
  createdAt?: string;
}

export interface AuthProgram {
  id: string;
  name: string;
  slug: string;
  status: string;
  branding?: unknown;
  createdByOrgId?: string;
  roleInProgram?: string | null;
  createdAt?: string;
  cropfortAfeBandAMaxEtb?: number;
  cropfortAfeBandBMaxEtb?: number;
  cropfortAfeBandCMaxEtb?: number;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  displayName: string;
  type: string;
  branding: unknown;
  status: string;
}

export interface MeResponse {
  user: AuthUser;
  tenant: AuthTenant;
  activeProgram: {
    id: string;
    name: string;
    slug: string;
    branding: unknown;
    cropfortAfeBandAMaxEtb?: number;
    cropfortAfeBandBMaxEtb?: number;
    cropfortAfeBandCMaxEtb?: number;
  } | null;
  programs: AuthProgram[];
  permissions: string[];
  onboardingComplete: boolean;
  mfaEnabled: boolean;
}

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  user: AuthUser;
  me?: MeResponse;
}

export type LoginResult =
  | (TokenBundle & { me: MeResponse })
  | {
      requiresOtp: true;
      otpChallengeToken: string;
      user: { id: string; email: string; name: string };
    }
  | {
      requiresTotpEnrollment: true;
      enrollmentToken: string;
      qrDataUrl: string;
      user: { id: string; email: string; name: string };
    };

export interface AuthSessionRow {
  id: string;
  deviceLabel: string;
  otpVerified: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  expiresAt: string;
}
