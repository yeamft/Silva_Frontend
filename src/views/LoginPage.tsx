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
import {
  markWorkspaceSelectionRequired,
  SELECT_WORKSPACE_PATH,
} from "@/lib/workspace-gate";
import { FormField } from "@/components/cropfort/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  {
    email: "admin@spx.example",
    label: "System Admin",
    org: "SPX",
    hint: "Platform & users",
  },
  {
    email: "principal@spx.example",
    label: "SPX Account Manager",
    org: "SPX",
    hint: "Run the programme",
  },
  {
    email: "owner@silva.example",
    label: "Silva Owner",
    org: "Silva",
    hint: "Govern & settle",
  },
  {
    email: "lead@bagro.example",
    label: "RFSP Lead",
    org: "Vendor",
    hint: "Field execution",
  },
] as const;

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
    if (isHydrated && isAuthenticated) {
      markWorkspaceSelectionRequired();
      router.replace(SELECT_WORKSPACE_PATH);
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  const clearErrors = () => {
    if (formError) setFormError("");
    if (fieldErrors.email || fieldErrors.password || fieldErrors.code) setFieldErrors({});
  };

  const finishSuccess = () => {
    toast.success(t(locale, "login_welcomeBack"));
    markWorkspaceSelectionRequired();
    router.replace(SELECT_WORKSPACE_PATH);
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
      finishSuccess();
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
      finishSuccess();
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
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="w-full max-w-[400px] space-y-5"
      >
        <div className="text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="cf-focus mx-auto mb-4 inline-flex items-center gap-2 rounded-lg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sprout className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">Cropfort</span>
          </button>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {mfaStep ? "Verify authenticator" : "Sign in"}
          </h1>
          {mfaStep ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Open your authenticator app and enter the 6-digit code.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} noValidate autoComplete="on" className="space-y-4">
            {mfaStep?.kind === "enroll" && mfaStep.qrDataUrl ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Scan this QR code, then enter the first code from your app.
                </p>
                <div className="flex justify-center rounded-xl border border-border/70 bg-background p-4">
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
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                        className="h-11 pl-10"
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
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                        className="h-11 pl-10 pr-11"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground"
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
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                      className="h-11 pl-10 tracking-[0.35em]"
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
              className="h-11 w-full gap-2 text-[15px] font-medium"
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
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => {
                const active = selectedDemo === account.email;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => pickDemo(account.email)}
                    className={cn(
                      "cf-focus rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border/70 bg-card hover:bg-muted/40",
                    )}
                  >
                    <span className="block truncate font-medium">{account.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {account.org}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            className="gap-1.5 text-muted-foreground"
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
