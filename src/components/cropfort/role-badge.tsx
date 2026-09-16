import { Badge } from "@/components/ui/badge";
import { CROPFORT_ROLE_LABELS, type CropfortRole } from "@/types/cropfort";

export function RoleBadge({ role }: { role: CropfortRole }) {
  return (
    <Badge variant="outline" className="font-normal">
      {CROPFORT_ROLE_LABELS[role]}
    </Badge>
  );
}
