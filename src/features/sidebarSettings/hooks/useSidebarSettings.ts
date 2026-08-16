import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@features/auth/hooks/useCurrentUser";
import {
  sidebarSettingsService,
  UpsertSidebarSettingsDto,
} from "../services/sidebarSettingsService";

export const useSidebarSettings = () => {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: ["sidebar-settings", user?._id],
    queryFn: () => sidebarSettingsService.getOne(),
    enabled: !!user,
    staleTime: Infinity, // this tab is the only writer — no need to refetch behind its own back
  });
};

export const useSaveSidebarSettings = () => {
  const qc = useQueryClient();
  const { data: user } = useCurrentUser();

  return useMutation({
    mutationFn: (dto: UpsertSidebarSettingsDto) =>
      sidebarSettingsService.upsert(dto),
    onSuccess: (settings) => {
      qc.setQueryData(["sidebar-settings", user?._id], settings);
    },
  });
};
