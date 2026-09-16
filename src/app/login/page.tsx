import dynamic from "next/dynamic";

const LoginPage = dynamic(() => import("@/views/LoginPage"), {
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30">
      <div className="h-40 w-full max-w-sm animate-pulse rounded-lg border bg-card" aria-label="Loading" />
    </div>
  ),
});

export default function LoginRoute() {
  return <LoginPage />;
}
