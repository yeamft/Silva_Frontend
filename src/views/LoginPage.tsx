"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
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
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { FormField } from "@/components/cropfort/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
    label: "B-Agro Lead",
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
    if (isHydrated && isAuthenticated) router.replace("/cropfort/dashboard");
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated || isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  const clearErrors = () => {
    if (formError) setFormError("");
    if (fieldErrors.email || fieldErrors.password || fieldErrors.code) setFieldErrors({});
  };

  const finishSuccess = () => {
    toast.success(t(locale, "login_welcomeBack"));
    router.replace("/cropfort/dashboard");
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
    <div className="relative flex min-h-[100dvh] bg-background text-foreground">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] overflow-hidden lg:flex lg:flex-col">
        <div className="cf-mesh absolute inset-0" aria-hidden />
        <div className="cf-grid-lines absolute inset-0 opacity-50" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-accent/15"
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="cf-focus inline-flex w-fit items-center gap-2.5 rounded-lg"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sprout className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-left">
              <span className="block font-display text-lg font-semibold tracking-tight">Cropfort</span>
              <span className="block text-xs text-muted-foreground">SPX Farm OS</span>
            </span>
          </button>

          <div className="flex flex-1 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease }}
              className="max-w-md space-y-5"
            >
             
              <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight xl:text-5xl">
                One workspace.
                <span className="mt-1 block text-primary">Clear roles.</span>
              </h1>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Sign in to your organization&apos;s programme govern, validate, or execute without
                crossing the wrong desk.
              </p>
              <ul className="flex flex-wrap gap-2 pt-1">
                {["Silva", "SPX", "Vendors"].map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium backdrop-blur-sm"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <div className="relative flex min-h-[100dvh] flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 lg:hidden"
          aria-hidden
        >
          <div className="cf-mesh absolute inset-0 opacity-80" />
        </div>

        <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="cf-focus flex items-center gap-2.5 rounded-lg lg:invisible lg:pointer-events-none"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold tracking-tight">Cropfort</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <LanguageToggle variant="segmented" />
            <ThemeToggle />
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className="w-full max-w-[420px] space-y-6"
          >
            <div className="space-y-2">
              
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                {mfaStep ? "Verify authenticator" : "Sign in"}
              </h2>
              {mfaStep ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Open your authenticator app and enter the 6-digit code.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4">
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
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="email"
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
                            autoComplete="new-password"
                            placeholder="password"
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
                  className="h-11 w-full gap-2 text-[15px] font-medium shadow-sm"
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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Try a demo desk</p>
                  <p className="text-[11px] text-muted-foreground/80">Password filled for you</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.map((account) => {
                    const active = selectedDemo === account.email;
                    return (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => pickDemo(account.email)}
                        className={cn(
                          "cf-focus group rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-200",
                          "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.04]",
                          active
                            ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                            : "border-border/70 bg-card/80",
                        )}
                      >
                        <span className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              active
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                            )}
                          >
                            <Building2 className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold tracking-tight">
                              {account.label}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {account.org} · {account.hint}
                            </span>
                          </span>
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
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
