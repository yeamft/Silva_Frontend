"use client";

import { CatalogModuleView } from "@/components/rate-cards/catalog-module-view";
import {
  useCreateMaterial,
  useDeleteMaterial,
  useMaterials,
  useUpdateMaterial,
} from "@/lib/query";

export default function MaterialsInventoryView() {
  const query = useMaterials(true);
  const create = useCreateMaterial();
  const update = useUpdateMaterial();
  const remove = useDeleteMaterial();

  return (
    <CatalogModuleView
      resource="materials"
      title="Materials & inventory"
      newLabel="New material"
      rows={query.data ?? []}
      loading={query.isLoading}
      showStock
      onCreate={(input) => create.mutateAsync(input)}
      onUpdate={(id, input) => update.mutateAsync({ id, input })}
      onDelete={(id) => remove.mutateAsync(id)}
      onRefresh={() => void query.refetch()}
    />
  );
}
