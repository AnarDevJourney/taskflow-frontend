import { ThemeConfig } from "antd";

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
