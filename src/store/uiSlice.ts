import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarCollapsed: boolean;
  activeWorkspaceId: string | null;
  activeProjectId: string | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  activeWorkspaceId: null,
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
    },
    setActiveProject(state, action: PayloadAction<string | null>) {
      state.activeProjectId = action.payload;
    },
  },
});

export const { toggleSidebar, setActiveWorkspace, setActiveProject } =
  uiSlice.actions;

export default uiSlice.reducer;
