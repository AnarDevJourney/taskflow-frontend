// The only three theme choices in the whole app. Anything that needs to
// name one of them imports this type/array instead of using string literals.
export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEMES: Theme[] = ["system", "light", "dark"];
export const DEFAULT_THEME: Theme = "system";

export const THEME_STORAGE_KEY = "taskflow-theme";

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}
