"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, MIN_PASSWORD_LENGTH } from "@/store/authStore";
import { useLocaleStore } from "@/store/localeStore";
import { t } from "@/lib/translations";
import { continueAfterAuth } from "@/lib/post-auth-workspace";
import { FormField } from "@/components/cropfort/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  // SPX
  {
    email: "admin@spx.example",
    label: "System Admin",
    org: "SPX",
    hint: "admin@spx.example",
  },
  {
    email: "principal@spx.example",
    label: "SPX Principal",
    org: "SPX",
    hint: "principal@spx.example",
  },
  {
    email: "handler@spx.example",
    label: "SPX Account Handler",
    org: "SPX",
    hint: "handler@spx.example",
  },
  {
    email: "supervisor@spx.example",
    label: "SPX Field Supervisor",
    org: "SPX",
    hint: "supervisor@spx.example",
  },
  // Silva
  {
    email: "owner@silva.example",
    label: "Silva Owner",
    org: "Silva",
    hint: "owner@silva.example",
  },
  {
    email: "cm@silva.example",
    label: "Silva Country Manager",
    org: "Silva",
    hint: "cm@silva.example",
  },
  {
    email: "finance@silva.example",
    label: "Silva Finance",
    org: "Silva",
    hint: "finance@silva.example",
  },
  // Vendor (B-Agro / RFSP)
  {
    email: "admin@bagro.example",
    label: "Vendor Admin",
    org: "Vendor",
    hint: "admin@bagro.example",
  },
  {
    email: "manager@bagro.example",
    label: "Vendor Manager",
    org: "Vendor",
    hint: "manager@bagro.example",
  },
  {
    email: "supervisor@bagro.example",
    label: "Vendor Supervisor",
    org: "Vendor",
    hint: "supervisor@bagro.example",
  },
  {
    email: "lead@bagro.example",
    label: "Vendor Field Lead",
    org: "Vendor",
    hint: "lead@bagro.example",
  },
  {
    email: "worker@bagro.example",
    label: "Vendor Worker",
    org: "Vendor",
    hint: "worker@bagro.example",
  },
] as const;

const DEMO_ORGS = ["SPX", "Silva", "Vendor"] as const;

const DEMO_PASSWORD = "Password123!";

interface FieldErrors {
  email?: string;
  password?: string;
  code?: string;
}

type MfaStep =
  | null
  | { kind: "otp"; token: string }
  | { kind: "enroll"; token: string; qrDataUrl?: string };

const ease = [0.16, 1, 0.36, 1] as const;

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaStep, setMfaStep] = useState<MfaStep>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const completeOtp = useAuthStore((s) => s.completeOtp);
  const completeTotpEnrollment = useAuthStore((s) => s.completeTotpEnrollment);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      const path = await continueAfterAuth();
      if (!cancelled) router.replace(path);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || isAuthenticated) {
    return (
      <div className="cf-gold-marketing flex min-h-[100dvh] items-center justify-center cf-auth-shell">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  const clearErrors = () => {
    if (formError) setFormError("");
    if (fieldErrors.email || fieldErrors.password || fieldErrors.code) setFieldErrors({});
  };

  const finishSuccess = async () => {
    toast.success(t(locale, "login_welcomeBack"));
    const path = await continueAfterAuth();
    router.replace(path);
  };

  const pickDemo = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setSelectedDemo(accountEmail);
    setShowPassword(false);
    clearErrors();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (mfaStep) {
      const errors: FieldErrors = {};
      if (otpCode.trim().length < 6) errors.code = "Enter the 6-digit authenticator code";
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setIsLoading(true);
      setFormError("");
      const mfaResult =
        mfaStep.kind === "otp"
          ? await completeOtp(mfaStep.token, otpCode.trim())
          : await completeTotpEnrollment(mfaStep.token, otpCode.trim());
      setIsLoading(false);

      if (!mfaResult.ok) {
        setFormError(mfaResult.error);
        return;
      }
      void finishSuccess();
      return;
    }

    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = "Enter your work email";
    if (password.trim().length < MIN_PASSWORD_LENGTH) {
      errors.password = t(locale, "login_passwordTooShort").replace(
        "{min}",
        String(MIN_PASSWORD_LENGTH),
      );
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    setFormError("");
    const loginResult = await login(email.trim(), password);
    setIsLoading(false);

    if (loginResult.ok) {
      void finishSuccess();
      return;
    }

    if (loginResult.requiresOtp && loginResult.otpChallengeToken) {
      setMfaStep({ kind: "otp", token: loginResult.otpChallengeToken });
      setFormError(loginResult.error);
      return;
    }

    if (loginResult.requiresTotpEnrollment && loginResult.enrollmentToken) {
      setMfaStep({
        kind: "enroll",
        token: loginResult.enrollmentToken,
        qrDataUrl: loginResult.qrDataUrl,
      });
      setFormError(loginResult.error);
      return;
    }

    setFormError(loginResult.error || t(locale, "login_invalidPassword"));
  };

  return (
    <div className="cf-gold-marketing relative flex min-h-[100dvh] items-center justify-center cf-auth-shell px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-[hsl(120_30%_60%/0.12)] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="relative z-10 w-full max-w-[420px] space-y-6"
      >
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="cf-focus mx-auto mb-5 inline-flex items-center gap-2.5 rounded-xl"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)]">
              <Sprout className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-left leading-tight">
              <span className="block font-display text-xl font-semibold tracking-tight">
                Cropfort
              </span>
            
            </span>
          </button>
          {mfaStep ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Open your authenticator app and enter the 6-digit code.
            </p>
          ) : null}
        </div>

        <div className="cf-auth-card rounded-2xl p-6 sm:p-7">
          <form onSubmit={handleSubmit} noValidate autoComplete="on" className="space-y-4">
            {mfaStep?.kind === "enroll" && mfaStep.qrDataUrl ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Scan this QR code, then enter the first code from your app.
                </p>
                <div className="flex justify-center rounded-xl border border-border/80 bg-background p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mfaStep.qrDataUrl}
                    alt="TOTP enrollment QR code"
                    className="h-44 w-44"
                  />
                </div>
              </div>
            ) : null}

            {!mfaStep ? (
              <>
                <FormField
                  label="Work email"
                  required
                  error={fieldErrors.email}
                  render={(props) => (
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
                        aria-hidden
                      />
                      <Input
                        {...props}
                        name="email"
                        type="email"
                        autoComplete="username"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setSelectedDemo(null);
                          clearErrors();
                        }}
                        className="h-11 border-border/80 bg-background/80 pl-10 focus-visible:ring-primary/40"
                      />
                    </div>
                  )}
                />

                <FormField
                  label={t(locale, "login_passwordLabel")}
                  required
                  error={fieldErrors.password}
                  render={(props) => (
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
                        aria-hidden
                      />
                      <Input
                        {...props}
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setSelectedDemo(null);
                          clearErrors();
                        }}
                        className="h-11 border-border/80 bg-background/80 pl-10 pr-11 focus-visible:ring-primary/40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={t(
                          locale,
                          showPassword ? "login_hidePassword" : "login_showPassword",
                        )}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  )}
                />
              </>
            ) : (
              <FormField
                label="Authenticator code"
                required
                error={fieldErrors.code}
                render={(props) => (
                  <div className="relative">
                    <ShieldCheck
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
                      aria-hidden
                    />
                    <Input
                      {...props}
                      name="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        clearErrors();
                      }}
                      className="h-11 border-border/80 bg-background/80 pl-10 tracking-[0.35em] focus-visible:ring-primary/40"
                      maxLength={6}
                    />
                  </div>
                )}
              />
            )}

            {formError ? (
              <Alert variant="destructive" aria-live="assertive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full gap-2 text-[15px] font-semibold shadow-[0_12px_28px_-14px_hsl(120_35%_28%/0.4)] hover:bg-[hsl(var(--primary-hover))]"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isLoading
                ? t(locale, "login_signingIn")
                : mfaStep
                  ? "Verify and continue"
                  : "Sign in"}
            </Button>

            {mfaStep ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full gap-2"
                onClick={() => {
                  setMfaStep(null);
                  setOtpCode("");
                  clearErrors();
                }}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to sign in
              </Button>
            ) : null}
          </form>
        </div>

        {!mfaStep ? (
          <div className="space-y-3">
            <p className="text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Quick demo access · Password123!
            </p>
            {DEMO_ORGS.map((org) => {
              const accounts = DEMO_ACCOUNTS.filter((a) => a.org === org);
              return (
                <div key={org} className="space-y-1.5">
                  <p className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
                    {org}
                    {org === "Vendor" ? " · B-Agro / RFSP" : ""}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {accounts.map((account) => {
                      const active = selectedDemo === account.email;
                      return (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => pickDemo(account.email)}
                          className={cn(
                            "cf-focus rounded-xl border px-3 py-2 text-left text-sm transition-all",
                            active
                              ? "border-primary/50 bg-accent shadow-sm"
                              : "border-border/80 bg-card/70 hover:border-primary/35 hover:bg-accent/60",
                          )}
                        >
                          <span className="block truncate font-medium text-foreground">
                            {account.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {account.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-primary"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
