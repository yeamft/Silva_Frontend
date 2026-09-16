"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";
import { acceptInvite, getInvitePreview, type InvitePreview } from "@/lib/api/invite";
import ThemeToggle from "@/components/ThemeToggle";
import { FormField } from "@/components/cropfort/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_PASSWORD = 8;

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setPreviewError("This invitation link is missing a token.");
        setLoadingPreview(false);
        return;
      }
      setLoadingPreview(true);
      try {
        const data = await getInvitePreview(token);
        if (cancelled) return;
        setPreview(data);
        setName(data.name || "");
        setPreviewError("");
      } catch (err) {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : "Invitation could not be loaded");
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !token) return;

    const next: typeof fieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters`;
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      await acceptInvite({ token, name: name.trim(), password });
      toast.success("Invitation accepted. You can sign in now.");
      router.replace("/login");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="cf-focus flex items-center gap-2.5 rounded-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="h-4 w-4" aria-hidden />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">Cropfort</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Accept invitation</h1>
            <p className="text-sm text-muted-foreground">
              Set your password to join your organization on Cropfort.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading invitation" />
              </div>
            ) : previewError ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>{previewError}</AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/login">Go to sign in</Link>
                </Button>
              </div>
            ) : preview ? (
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                  <p>
                    <span className="text-muted-foreground">Organization · </span>
                    <span className="font-medium">{preview.orgName}</span>
                  </p>
                  <p className="mt-1">
                    <span className="text-muted-foreground">Email · </span>
                    <span className="font-medium">{preview.email}</span>
                  </p>
                  {preview.invitedByName ? (
                    <p className="mt-1 text-muted-foreground">Invited by {preview.invitedByName}</p>
                  ) : null}
                </div>

                {formError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}

                <FormField
                  label="Full name"
                  error={fieldErrors.name}
                  required
                  render={(props) => (
                    <Input
                      {...props}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      disabled={submitting}
                    />
                  )}
                />

                <FormField
                  label="Password"
                  error={fieldErrors.password}
                  required
                  render={(props) => (
                    <Input
                      {...props}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  )}
                />

                <FormField
                  label="Confirm password"
                  error={fieldErrors.confirmPassword}
                  required
                  render={(props) => (
                    <Input
                      {...props}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  )}
                />

                <Button type="submit" className="h-11 w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Accepting…
                    </>
                  ) : (
                    "Accept invitation"
                  )}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
