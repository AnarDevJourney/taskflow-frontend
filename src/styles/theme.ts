import { ThemeConfig, theme as antdThemeApi } from "antd";

export const tokens = {
  primary: "#4a6cf7",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#f85149",

  bg: "#F5F6FA",
  card: "#FFFFFF",
  border: "#E8E8E8",
  text: "#1a1f2e",
  muted: "#8c8c8c",
  inputBg: "#FFFFFF",

  priority: {
    critical: "#f5222d",
    high: "#fa8c16",
    medium: "#4a6cf7",
    low: "#8c8c8c",
  },
};

// dark equivalents of the same semantic roles — kept in this file
// alongside lightTheme since AntD's ConfigProvider needs plain color
// values (it derives shades from these), not CSS custom properties. The
// app's own CSS (global.css's [data-theme="dark"] block) mirrors these
// same values as --token variables for non-AntD elements.
export const darkTokens = {
  primary: "#3B82F6",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",

  bg: "#0B1220",
  card: "#111827",
  cardSecondary: "#1F2937",
  border: "#374151",
  text: "#F3F4F6",
  muted: "#9CA3AF",
  inputBg: "#111827",

  priority: {
    critical: "#EF4444",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#9CA3AF",
  },
};

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.primary,
    colorBgBase: tokens.bg,
    colorBgContainer: tokens.card,
    colorBorder: tokens.border,
    colorText: tokens.text,
    colorTextSecondary: tokens.muted,
    colorBgElevated: tokens.card,
    colorBgLayout: tokens.bg,
    borderRadius: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 15,
    fontSizeLG: 16,
    controlHeight: 38,
    controlHeightLG: 44,
  },
  components: {
    Layout: {
      siderBg: tokens.card,
      headerBg: tokens.card,
      bodyBg: tokens.bg,
    },
    Menu: {
      itemBg: tokens.card,
      itemSelectedBg: `${tokens.primary}12`,
      itemSelectedColor: tokens.primary,
    },
    Card: {
      colorBgContainer: tokens.card,
    },
    Button: {
      borderRadius: 6,
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: antdThemeApi.darkAlgorithm,
  token: {
    colorPrimary: darkTokens.primary,
    colorBgBase: darkTokens.bg,
    colorBgContainer: darkTokens.card,
    colorBorder: darkTokens.border,
    colorText: darkTokens.text,
    colorTextSecondary: darkTokens.muted,
    colorBgElevated: darkTokens.card,
    colorBgLayout: darkTokens.bg,
    borderRadius: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 15,
    fontSizeLG: 16,
    controlHeight: 38,
    controlHeightLG: 44,
  },
  components: {
    Layout: {
      siderBg: darkTokens.card,
      headerBg: darkTokens.card,
      bodyBg: darkTokens.bg,
    },
    Menu: {
      itemBg: darkTokens.card,
      itemSelectedBg: `${darkTokens.primary}22`,
      itemSelectedColor: darkTokens.primary,
    },
    Card: {
      colorBgContainer: darkTokens.card,
    },
    Button: {
      borderRadius: 6,
    },
  },
};
