import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const ACTIVE_WORKSPACE_STORAGE_KEY = "taskflow.activeWorkspaceId";

interface UiState {
  sidebarCollapsed: boolean;
  activeWorkspaceId: string | null;
  activeProjectId: string | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  activeWorkspaceId: localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY),
  activeProjectId: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setActiveWorkspace(state, action: PayloadAction<string | null>) {
      state.activeWorkspaceId = action.payload;
      if (action.payload) {
        localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, action.payload);
      } else {
        localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      }
    },
    setActiveProject(state, action: PayloadAction<string | null>) {
      state.activeProjectId = action.payload;
    },
  },
});

export const { toggleSidebar, setActiveWorkspace, setActiveProject } =
  uiSlice.actions;

export default uiSlice.reducer;
