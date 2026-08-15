import api from "@lib/axios";
import { ApiResponse } from "@types/index";

export interface TableColumnSetting {
  id: string;
  visible: boolean;
  width?: number | null;
}

export interface TableSettings {
  tableView: string | null;
  pageSize: number | null;
  columns: TableColumnSetting[];
}

export interface UpsertTableSettingsDto {
  tableView?: string;
  pageSize?: number;
  columns?: TableColumnSetting[];
}

export const tableSettingsService = {
  getOne: async (key: string): Promise<TableSettings | null> => {
    const res = await api.get<ApiResponse<TableSettings | null>>(
      `/table-settings/${key}`,
    );
    return res.data.data;
  },

  upsert: async (
    key: string,
    dto: UpsertTableSettingsDto,
  ): Promise<TableSettings> => {
    const res = await api.put<ApiResponse<TableSettings>>(
      `/table-settings/${key}`,
      dto,
    );
    return res.data.data;
  },
};
