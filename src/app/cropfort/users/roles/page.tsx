import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const RolesView = dynamic(() => import("./roles-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function RolesPage() {
  return <RolesView />;
}
