import api from "@lib/axios";
import { ApiResponse } from "@types/index";

export interface SidebarModuleSetting {
  id: string;
  visible: boolean;
}

export interface SidebarSettings {
  modules: SidebarModuleSetting[];
  collapsed: boolean;
}

export interface UpsertSidebarSettingsDto {
  modules?: SidebarModuleSetting[];
  collapsed?: boolean;
}

export const sidebarSettingsService = {
  getOne: async (): Promise<SidebarSettings | null> => {
    const res = await api.get<ApiResponse<SidebarSettings | null>>(
      "/sidebar-settings",
    );
    return res.data.data;
  },

  upsert: async (dto: UpsertSidebarSettingsDto): Promise<SidebarSettings> => {
    const res = await api.put<ApiResponse<SidebarSettings>>(
      "/sidebar-settings",
      dto,
    );
    return res.data.data;
  },
};
