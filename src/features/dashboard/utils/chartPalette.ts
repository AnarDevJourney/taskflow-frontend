import { Priority, TaskStatusBucket } from "@types/index";

/**
 * Chart colors for the dashboard.
 *
 * These are **not** the `var(--token)` UI colors. Chart fills answer to
 * different constraints than surfaces and borders do — a lightness band, a
 * chroma floor, and a colorblind-separation floor against the surface they
 * sit on — so each palette below is declared per theme and was checked with a
 * palette validator against this app's real surfaces (`#ffffff` light,
 * `#111827` dark, the `--surface` token in both themes) before being used.
 *
 * Recharts needs literal color values (it writes them into SVG `fill`
 * attributes and interpolates them during animation), which is the other
 * reason these are hex rather than `var()` references.
 */

// ─── Task status — a categorical palette ─────────────────────────────
// The three buckets are independent workflow states with no magnitude
// between them, so each gets its own hue, assigned in a fixed order that
// never changes with the data. A bucket that empties keeps its color;
// nothing repaints when the numbers move.
//
// Validated (all pairs, both modes): worst colorblind separation ΔE 9.2
// light / 9.4 dark against a floor of 8; worst normal-vision separation
// ΔE 24.0 light / 20.9 dark against a floor of 15.
const STATUS_COLORS: Record<"light" | "dark", Record<TaskStatusBucket, string>> = {
  light: {
    todo: "#2a78d6",
    in_progress: "#eb6834",
    done: "#1baf7a",
  },
  dark: {
    todo: "#3987e5",
    in_progress: "#d95926",
    done: "#199e70",
  },
};

// ─── Priority — a categorical palette, four distinct hues ────────────
// Four genuinely different hues, not four steps of one ramp: the severity
// order is already carried by the legend's labels (Critical/High/Medium/Low),
// so color's job here is pure identity — telling slices apart at a glance —
// and a same-hue ramp is the wrong tool for that (its shallow ΔE between
// steps is what makes a ramp read as "the same color, different shades").
//
// The obvious four — red, orange, yellow, green — do not survive together:
// exhaustively checking every 4-hue subset of this app's validated 8-hue
// categorical set against both surfaces (all-pairs, since a donut shows every
// slice at once and any two can sit next to each other) leaves exactly two
// passing sets, both without red or orange. This is magenta/yellow/blue/green,
// assigned by how alarming each hue reads (magenta ≈ hottest available here)
// so "critical" still gets the most attention-grabbing color on offer.
//
// Validated (all pairs, both modes): worst colorblind separation ΔE 13.0
// light (protan) / 6.9 dark (protan, in the 6–8 floor band — legal because
// this chart already carries secondary encoding: the legend prints label +
// count + share per slice, never color alone); worst normal-vision
// separation ΔE 19.6 light / 19.3 dark against a floor of 15.
//
// This is the one place the dashboard's colors part company with the app's
// `priorityColors` (used by the priority badges, including the ones in the
// My Tasks widget on this same page). Badges are text on a tint and carry
// their label, so they answer to text-contrast rules; a donut segment is a
// bare block of color and answers to the chart rules above — the two were
// never meant to match hue-for-hue.
const PRIORITY_COLORS: Record<"light" | "dark", Record<Priority, string>> = {
  light: {
    [Priority.CRITICAL]: "#e87ba4", // magenta
    [Priority.HIGH]: "#eda100", // yellow
    [Priority.MEDIUM]: "#2a78d6", // blue
    [Priority.LOW]: "#008300", // green
  },
  dark: {
    [Priority.CRITICAL]: "#d55181", // magenta
    [Priority.HIGH]: "#c98500", // yellow
    [Priority.MEDIUM]: "#3987e5", // blue
    [Priority.LOW]: "#008300", // green (same hex both modes — already clears dark-surface contrast)
  },
};

// ─── Single-series charts — one series, one color ────────────────────
// The trend line and the workload bars each plot one measure, so they take
// the first categorical slot and nothing else. Giving each bar its own hue
// would spend the color channel on information the bar length already
// carries, and — since bars are sorted by size — would repaint everyone the
// moment someone's count changed, so a reader could never learn "the green
// one is Ramin". Identity comes from the name beside the bar.
//
// (They share this hue with the status donut's `todo` slice — harmless,
// since they are separate charts with their own titles; the rules that
// matter are within-chart.)
const SERIES_COLORS: Record<"light" | "dark", string> = {
  light: "#2a78d6",
  dark: "#3987e5",
};

// ─── Activity heatmap — a sequential ramp ────────────────────────────
// Five steps: an empty-day track plus four green levels, light→dark in light
// mode and dark→bright in dark mode. Green is the contribution-graph
// convention and these are GitHub's own steps.
//
// This is a *sequential* encoding (continuous magnitude binned into levels),
// not an ordinal one, which is why the faintest step is allowed to sit close
// to the surface: on this scale "barely visible" correctly means "almost
// nothing happened". Validated as sequential — lightness is monotone across
// the four levels and the hue holds (2° spread light, 11° dark). Running it
// against the *ordinal* gate instead would flag the light end for contrast
// (1.44:1 light / 1.59:1 dark); that gate does not apply here, so do not
// "fix" it by darkening level 1 — that would make one activity look like a
// busy day.
//
// Level 0 is the unfilled track, not data.
const HEATMAP_LEVELS: Record<"light" | "dark", string[]> = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#1f2937", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

// ─── Chart chrome ────────────────────────────────────────────────────
// Gridlines, axis text and the ring drawn around a hovered dot. These
// duplicate `global.css`'s `--border` / `--text-secondary` / `--surface`
// on purpose: Recharts writes them into SVG *attributes*, where `var()`
// does not resolve. Keep them in step with the tokens if those change.
const CHROME_COLORS: Record<
  "light" | "dark",
  { grid: string; axis: string; surface: string; text: string; track: string }
> = {
  light: {
    grid: "#e5e7eb",
    axis: "#6b7280",
    surface: "#ffffff",
    text: "#111827",
    track: "#f3f4f6",
  },
  dark: {
    grid: "#374151",
    axis: "#9ca3af",
    surface: "#111827",
    text: "#f3f4f6",
    track: "#1f2937",
  },
};

export type ResolvedTheme = "light" | "dark";

export const statusChartColors = (theme: ResolvedTheme) => STATUS_COLORS[theme];

export const trendChartColor = (theme: ResolvedTheme) => SERIES_COLORS[theme];

export const workloadChartColor = (theme: ResolvedTheme) => SERIES_COLORS[theme];

export const chartChromeColors = (theme: ResolvedTheme) => CHROME_COLORS[theme];

export const heatmapLevelColors = (theme: ResolvedTheme) => HEATMAP_LEVELS[theme];

/** how many filled levels the heatmap ramp has, above the empty track */
export const HEATMAP_LEVEL_COUNT = 4;

export const priorityChartColors = (theme: ResolvedTheme) => PRIORITY_COLORS[theme];

/**
 * Fixed render order for both charts. Declared here rather than taken from
 * the response so a slice never moves position between refetches — the
 * backend already returns both distributions zero-filled in this order, and
 * this is the client-side half of that guarantee.
 */
export const STATUS_ORDER: TaskStatusBucket[] = ["todo", "in_progress", "done"];

export const PRIORITY_ORDER: Priority[] = [
  Priority.CRITICAL,
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
];
