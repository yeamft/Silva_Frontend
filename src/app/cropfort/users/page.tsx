import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const UsersView = dynamic(() => import("./users-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function UsersPage() {
  return <UsersView />;
}
