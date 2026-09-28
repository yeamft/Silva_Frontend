import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("@/views/LandingPage"), {
  loading: () => (
    <div className="cf-gold-marketing flex min-h-[100dvh] items-center justify-center cf-auth-shell">
      <div className="h-8 w-8 animate-pulse rounded-md bg-primary/25" aria-label="Loading" />
    </div>
  ),
});

export default function HomePage() {
  return <LandingPage />;
}
