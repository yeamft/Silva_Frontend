import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const ProfileView = dynamic(() => import("./profile-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function ProfilePage() {
  return <ProfileView />;
}
