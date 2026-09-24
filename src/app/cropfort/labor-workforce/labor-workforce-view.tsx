"use client";

import { CatalogModuleView } from "@/components/rate-cards/catalog-module-view";
import {
  useCreateLaborActivity,
  useDeleteLaborActivity,
  useLaborActivities,
  useUpdateLaborActivity,
} from "@/lib/query";

export default function LaborWorkforceView() {
  const query = useLaborActivities(true);
  const create = useCreateLaborActivity();
  const update = useUpdateLaborActivity();
  const remove = useDeleteLaborActivity();

  return (
    <CatalogModuleView
      resource="labor"
      title="Labor & workforce"
      newLabel="New labor activity"
      rows={query.data ?? []}
      loading={query.isLoading}
      onCreate={(input) => create.mutateAsync(input)}
      onUpdate={(id, input) => update.mutateAsync({ id, input })}
      onDelete={(id) => remove.mutateAsync(id)}
      onRefresh={() => void query.refetch()}
    />
  );
}
