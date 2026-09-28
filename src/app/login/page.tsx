import dynamic from "next/dynamic";

const LoginPage = dynamic(() => import("@/views/LoginPage"), {
  loading: () => (
    <div className="cf-gold-marketing flex min-h-[100dvh] items-center justify-center cf-auth-shell px-4">
      <div
        className="h-48 w-full max-w-sm animate-pulse rounded-2xl border border-primary/20 bg-card/80"
        aria-label="Loading"
      />
    </div>
  ),
});

export default function LoginRoute() {
  return <LoginPage />;
}
