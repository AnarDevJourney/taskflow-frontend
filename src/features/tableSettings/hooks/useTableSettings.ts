import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import {
  tableSettingsService,
  UpsertTableSettingsDto,
} from "../services/tableSettingsService";

export const useTableSettings = (key: string) => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: ["table-settings", key, user?._id],
    queryFn: () => tableSettingsService.getOne(key),
    enabled: !!user,
    staleTime: Infinity, // this tab is the only writer — no need to refetch behind its own back
  });
};

export const useSaveTableSettings = (key: string) => {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: (dto: UpsertTableSettingsDto) =>
      tableSettingsService.upsert(key, dto),
    onSuccess: (settings) => {
      qc.setQueryData(["table-settings", key, user?._id], settings);
    },
  });
};
