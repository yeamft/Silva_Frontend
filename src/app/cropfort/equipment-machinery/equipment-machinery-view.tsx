"use client";

import { CatalogModuleView } from "@/components/rate-cards/catalog-module-view";
import {
  useCreateEquipmentResource,
  useDeleteEquipmentResource,
  useEquipmentResources,
  useUpdateEquipmentResource,
} from "@/lib/query";

export default function EquipmentMachineryView() {
  const query = useEquipmentResources(true);
  const create = useCreateEquipmentResource();
  const update = useUpdateEquipmentResource();
  const remove = useDeleteEquipmentResource();

  return (
    <CatalogModuleView
      resource="equipment"
      title="Equipment & machinery"
      newLabel="New equipment resource"
      rows={query.data ?? []}
      loading={query.isLoading}
      onCreate={(input) => create.mutateAsync(input)}
      onUpdate={(id, input) => update.mutateAsync({ id, input })}
      onDelete={(id) => remove.mutateAsync(id)}
      onRefresh={() => void query.refetch()}
    />
  );
}
