import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("@/views/LandingPage"), {
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-8 w-8 animate-pulse rounded-md bg-muted" aria-label="Loading" />
    </div>
  ),
});

export default function HomePage() {
  return <LandingPage />;
}
