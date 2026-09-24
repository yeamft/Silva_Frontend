import dynamic from "next/dynamic";

const View = dynamic(() => import("./select-workspace-view"), {
  loading: () => (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="h-40 w-full max-w-md animate-pulse rounded-xl border bg-card" aria-label="Loading" />
    </div>
  ),
});

export default function SelectWorkspacePage() {
  return <View />;
}
