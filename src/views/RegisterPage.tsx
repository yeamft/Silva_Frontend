"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, type UserRole } from "@/store/authStore";
import { ROLE_LABELS } from "@/lib/rbac";
import ThemeToggle from "@/components/ThemeToggle";
import { FormField } from "@/components/cropfort/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MIN_PASSWORD = 6;

const ROLES: { value: UserRole; label: string }[] = (
  Object.entries(ROLE_LABELS) as [UserRole, string][]
).map(([value, label]) => ({ value, label }));

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("vendor_lead");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const register = useAuthStore((s) => s.register);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.replace("/cropfort/dashboard");
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  const clearErrors = () => {
    if (formError) setFormError("");
    if (Object.keys(errors).length > 0) setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address";
    if (password.length < MIN_PASSWORD) next.password = `Use at least ${MIN_PASSWORD} characters`;
    if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsLoading(true);
    setFormError("");
    const ok = await register(email, password, name.trim(), role);
    setIsLoading(false);

    if (ok) {
      toast.success("Account created");
      router.replace("/cropfort/dashboard");
    } else {
      setFormError("That email is already registered.");
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-muted/30">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary" aria-hidden>
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Coffee Field OS</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-sm space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create account</CardTitle>
            </CardHeader>

            <form onSubmit={handleSubmit} noValidate>
              <CardContent className="space-y-4">
                <FormField
                  label="Full name"
                  required
                  error={errors.name}
                  render={(props) => (
                    <Input
                      {...props}
                      autoComplete="name"
                      placeholder="e.g. Sara Mengistu"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearErrors();
                      }}
                    />
                  )}
                />

                <FormField
                  label="Email"
                  required
                  error={errors.email}
                  render={(props) => (
                    <Input
                      {...props}
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearErrors();
                      }}
                    />
                  )}
                />

                <FormField
                  label="Role"
                  render={({ id }) => (
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                <FormField
                  label="Password"
                  required
                  error={errors.password}
                  render={(props) => (
                    <Input
                      {...props}
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearErrors();
                      }}
                    />
                  )}
                />

                <FormField
                  label="Confirm password"
                  required
                  error={errors.confirmPassword}
                  render={(props) => (
                    <Input
                      {...props}
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        clearErrors();
                      }}
                    />
                  )}
                />

                {formError ? (
                  <Alert variant="destructive" aria-live="assertive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {isLoading ? "Creating account…" : "Create account"}
                </Button>
              </CardContent>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="cf-focus rounded font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
