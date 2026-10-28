"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sprout,
  UserCog,
  Users,
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
  {
    email: "admin@spx.example",
    label: "System Admin",
    org: "SPX",
    icon: UserCog,
  },
  {
    email: "principal@spx.example",
    label: "SPX Principal",
    org: "SPX",
    icon: ClipboardCheck,
  },
  {
    email: "owner@silva.example",
    label: "Asset Owner",
    org: "Silva · Approver",
    icon: ShieldCheck,
  },
  {
    email: "reviewer@chakabuna.example",
    label: "Chaka Buna",
    org: "View only",
    icon: Eye,
  },
  {
    email: "admin@bagro.example",
    label: "Vendor Admin",
    org: "Vendor · B-Agro",
    icon: Users,
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

const inputClass =
  "h-12 border-border/80 bg-background/80 pl-10 transition-[border-color,box-shadow] duration-200 hover:border-primary/35 focus-visible:ring-primary/40";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaStep, setMfaStep] = useState<MfaStep>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  /** Unlock fields only after focus — stops Chrome/Edge from injecting saved values. */
  const [emailLocked, setEmailLocked] = useState(true);
  const [passwordLocked, setPasswordLocked] = useState(true);
  const allowClearRef = useRef(true);

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

  // Strip values browsers may inject after paint; skip once the user picks a demo or types.
  useEffect(() => {
    const clear = () => {
      if (!allowClearRef.current) return;
      setEmail("");
      setPassword("");
      setOtpCode("");
    };
    clear();
    const t1 = window.setTimeout(clear, 50);
    const t2 = window.setTimeout(clear, 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

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
    allowClearRef.current = false;
    setEmailLocked(false);
    setPasswordLocked(false);
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setSelectedDemo(accountEmail);
    setShowPassword(false);
    clearErrors();
  };

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState("CapsLock"));
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

  const demoAccount = DEMO_ACCOUNTS.find((a) => a.email === selectedDemo);
  const submitLabel = isLoading
    ? t(locale, "login_signingIn")
    : mfaStep
      ? "Verify and continue"
      : demoAccount
        ? `Sign in as ${demoAccount.label}`
        : "Sign in";

  return (
    <div className="cf-gold-marketing text-foreground">
      <main className="cf-auth-shell relative flex min-h-[100dvh] flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="w-full max-w-[460px] space-y-6"
          >
            <Link href="/" className="cf-focus mx-auto flex w-fit items-center gap-2.5 rounded-xl" aria-label="Cropfort home">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_hsl(120_35%_28%/0.35)]">
                <Sprout className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-display text-xl font-semibold tracking-tight">Cropfort</span>
            </Link>

            <div className="cf-auth-card rounded-2xl p-6 sm:p-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mfaStep ? "mfa" : "credentials"}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease }}
                >
                  <header className="mb-6">
                    {mfaStep ? (
                      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                        <ShieldCheck className="h-5 w-5" aria-hidden />
                      </span>
                    ) : null}
                    <h1 className="font-display text-2xl font-semibold tracking-tight">
                      {mfaStep ? "Two-step verification" : t(locale, "login_welcomeTitle")}
                    </h1>
                  </header>

                  <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
                    {/* Decoy fields absorb browser autofill so real inputs stay empty. */}
                    <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
                      <input type="text" name="username" tabIndex={-1} autoComplete="username" />
                      <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
                    </div>

                    {mfaStep?.kind === "enroll" && mfaStep.qrDataUrl ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Scan this QR code, then enter the first code from your app.
                        </p>
                        <div className="flex justify-center rounded-xl border border-border/80 bg-background p-4">
                          <img src={mfaStep.qrDataUrl} alt="TOTP enrollment QR code" className="h-44 w-44" />
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
                                id="cf-login-email"
                                name="cf_work_email"
                                type="text"
                                inputMode="email"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                readOnly={emailLocked}
                                data-1p-ignore
                                data-lpignore="true"
                                data-bwignore="true"
                                data-form-type="other"
                                placeholder="you@company.com"
                                value={email}
                                onFocus={() => {
                                  allowClearRef.current = false;
                                  setEmailLocked(false);
                                }}
                                onChange={(e) => {
                                  allowClearRef.current = false;
                                  setEmail(e.target.value);
                                  setSelectedDemo(null);
                                  clearErrors();
                                }}
                                className={inputClass}
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
                                id="cf-login-secret"
                                name="cf_work_secret"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                readOnly={passwordLocked}
                                data-1p-ignore
                                data-lpignore="true"
                                data-bwignore="true"
                                data-form-type="other"
                                placeholder="Password"
                                value={password}
                                onFocus={() => {
                                  allowClearRef.current = false;
                                  setPasswordLocked(false);
                                }}
                                onBlur={() => setCapsLock(false)}
                                onKeyDown={trackCapsLock}
                                onKeyUp={trackCapsLock}
                                onChange={(e) => {
                                  allowClearRef.current = false;
                                  setPassword(e.target.value);
                                  setSelectedDemo(null);
                                  clearErrors();
                                }}
                                className={cn(inputClass, "pr-11")}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

                        {capsLock ? (
                          <p className="-mt-2 flex items-center gap-1.5 text-xs text-amber-700" role="status">
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                            Caps Lock is on
                          </p>
                        ) : null}
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
                              id="cf-login-otp"
                              name="cf_otp_code"
                              inputMode="numeric"
                              autoComplete="off"
                              autoFocus
                              data-1p-ignore
                              data-lpignore="true"
                              data-bwignore="true"
                              placeholder="123456"
                              value={otpCode}
                              onChange={(e) => {
                                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                                clearErrors();
                              }}
                              className={cn(inputClass, "text-lg tracking-[0.35em]")}
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
                      className="group h-12 w-full gap-2 text-[15px] font-semibold shadow-[0_12px_28px_-14px_hsl(120_35%_28%/0.4)] transition-[box-shadow,background-color] duration-200 hover:bg-[hsl(var(--primary-hover))] hover:shadow-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      <span className="truncate">{submitLabel}</span>
                      {!isLoading ? (
                        <ArrowRight
                          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      ) : null}
                    </Button>

                    {mfaStep ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 w-full gap-2 transition-colors hover:bg-accent"
                        onClick={() => {
                          setMfaStep(null);
                          setOtpCode("");
                          clearErrors();
                        }}
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Back to sign in
                      </Button>
                    ) : (
                      <Link
                        href="/"
                        className="cf-focus mx-auto flex h-9 w-fit items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Back to home
                      </Link>
                    )}
                  </form>
                </motion.div>
              </AnimatePresence>
            </div>

            {!mfaStep ? (
              <section aria-labelledby="demo-heading" className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <h2 id="demo-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Or try a demo workspace
                  </h2>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((account) => {
                    const active = selectedDemo === account.email;
                    const Icon = account.icon;
                    return (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => pickDemo(account.email)}
                        aria-pressed={active}
                        title={account.email}
                        className={cn(
                          "cf-focus flex items-center gap-3 rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200",
                          active
                            ? "border-primary/50 bg-card shadow-[0_10px_24px_-16px_hsl(114_45%_22%/0.5)]"
                            : "border-border/80 bg-card/60 hover:border-primary/35 hover:bg-card",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                            active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
                          )}
                        >
                          {active ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{account.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{account.org}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Password:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                    {DEMO_PASSWORD}
                  </code>
                </p>
              </section>
            ) : null}

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/#contact" className="font-medium text-primary underline-offset-4 hover:underline">
                Request access
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
