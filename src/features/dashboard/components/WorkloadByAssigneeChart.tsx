import { KeyboardEvent, memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { DashboardWorkloadEntry } from "@types/index";
import {
  chartChromeColors,
  ResolvedTheme,
  workloadChartColor,
} from "../utils/chartPalette";
import styles from "./WorkloadByAssigneeChart.module.css";

interface Props {
  /** busiest first, already capped by the backend */
  data: DashboardWorkloadEntry[];
  /** the viewer, so their own bar can be marked — never color-coded */
  currentUserId?: string;
  theme: ResolvedTheme;
  /**
   * When given, every assignee's name becomes a button that calls this with
   * their `userId`. Omit it to keep the chart purely informational — nothing
   * is clickable by default.
   */
  onNameClick?: (userId: string) => void;
}

const ANIMATION_MS = 300;
const ANIMATION_BEGIN_MS = 0;

/** vertical space one bar row occupies, including its share of the gaps */
const ROW_HEIGHT = 44;
const BAR_THICKNESS = 18;
/** how much of the card's width the name column gets */
const NAME_AXIS_WIDTH = 128;
/**
 * Longest name rendered before it is cut short. Kept comfortably under what
 * NAME_AXIS_WIDTH fits at 13px — the viewer's own row renders bold, which is
 * wider, and an over-long name is clipped at the card's left edge rather than
 * wrapping, so the budget has to hold for the widest case.
 */
const NAME_MAX_CHARS = 12;

/**
 * Open tasks per person, longest bar first.
 *
 * Horizontal bars rather than a donut because this compares magnitudes
 * across people, and names need somewhere to sit — a donut with eight
 * similar wedges and an eight-row legend answers "who has the most?" far
 * worse than a sorted bar list does.
 *
 * All bars share one color on purpose. The length already says who is busy;
 * a hue per person would spend the color channel restating it, and because
 * the rows are sorted by count, every bar would repaint the moment someone's
 * number changed. Identity lives in the name beside the bar.
 */
function WorkloadByAssigneeChart({
  data,
  currentUserId,
  theme,
  onNameClick,
}: Props) {
  const { t } = useTranslation();
  const color = workloadChartColor(theme);
  const chrome = chartChromeColors(theme);

  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        name: entry.name ?? t("dashboardPage.activity.unknownUser"),
        isCurrentUser: entry.userId === currentUserId,
      })),
    [data, currentUserId, t],
  );

  const total = useMemo(
    () => chartData.reduce((sum, entry) => sum + entry.count, 0),
    [chartData],
  );

  if (chartData.length === 0) {
    return (
      <section className={styles.card}>
        <h3 className={styles.title}>{t("dashboardPage.workload.title")}</h3>
        <p className={styles.empty}>{t("dashboardPage.workload.empty")}</p>
      </section>
    );
  }

  return (
    <section
      className={styles.card}
      aria-label={t("dashboardPage.workload.title")}
    >
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{t("dashboardPage.workload.title")}</h3>
          <p className={styles.subtitle}>
            {t("dashboardPage.workload.subtitle")}
          </p>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryValue}>{total}</span>
          <span className={styles.summaryLabel}>
            {t("dashboardPage.workload.totalLabel")}
          </span>
        </div>
      </header>

      {/* the chart grows a row at a time rather than squeezing more people
          into a fixed height — bars thinner than their labels are unreadable */}
      <ResponsiveContainer width="100%" height={chartData.length * ROW_HEIGHT}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
        >
          {/* no visible x-axis: the value sits at each bar's tip, so a scale
              underneath would be a second way to read the same number */}
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={NAME_AXIS_WIDTH}
            axisLine={false}
            tickLine={false}
            tick={
              <NameTick
                chrome={chrome}
                rows={chartData}
                onNameClick={onNameClick}
              />
            }
          />

          <Tooltip
            content={
              // NOTE: not `label` — Recharts clones this element and injects
              // its own `label` (the active category) over any prop of that
              // name, which silently replaced this text with the person's name
              <WorkloadTooltip
                color={color}
                unitLabel={t("dashboardPage.workload.tooltipLabel")}
              />
            }
            cursor={false}
            wrapperStyle={{ outline: "none" }}
          />

          <Bar
            dataKey="count"
            fill={color}
            barSize={BAR_THICKNESS}
            // rounded at the data end, square at the baseline — the shape
            // itself says which end is the measurement
            radius={[0, 4, 4, 0]}
            // the unfilled remainder, so every bar reads against the same
            // full-width track instead of floating in space
            background={{ fill: chrome.track, radius: [0, 4, 4, 0] }}
            animationBegin={ANIMATION_BEGIN_MS}
            animationDuration={ANIMATION_MS}
            isAnimationActive
          >
            <LabelList
              dataKey="count"
              position="right"
              offset={10}
              fill={chrome.text}
              fontSize={13}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}

interface NameTickProps {
  x?: number;
  y?: number;
  payload?: { value: string; index: number };
  chrome: ReturnType<typeof chartChromeColors>;
  rows: { isCurrentUser: boolean; userId: string }[];
  onNameClick?: (userId: string) => void;
}

/**
 * The name beside each bar. Long names are cut with an ellipsis rather than
 * allowed to run under the bars, and the viewer's own row is marked by weight
 * and ink — never by giving their bar a different color, which would make the
 * chart look like it encodes something it doesn't.
 *
 * Clickable only when `onNameClick` is passed — same "nothing is interactive
 * unless a handler says so" rule as the rest of the dashboard's charts.
 */
function NameTick({ x = 0, y = 0, payload, chrome, rows, onNameClick }: NameTickProps) {
  if (!payload) return <g />;

  const row = rows[payload.index];
  const isCurrentUser = row?.isCurrentUser ?? false;
  const label =
    payload.value.length > NAME_MAX_CHARS
      ? `${payload.value.slice(0, NAME_MAX_CHARS - 1)}…`
      : payload.value;

  const clickable = !!onNameClick && !!row?.userId;

  return (
    <text
      x={x - 12}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={13}
      fontWeight={isCurrentUser ? 700 : 500}
      fill={isCurrentUser ? chrome.text : chrome.axis}
      style={clickable ? { cursor: "pointer" } : undefined}
      {...(clickable
        ? {
            role: "button",
            tabIndex: 0,
            onClick: () => onNameClick!(row.userId),
            onKeyDown: (e: KeyboardEvent<SVGTextElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNameClick!(row.userId);
              }
            },
          }
        : {})}
    >
      {label}
    </text>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { name: string; count: number } }[];
  color: string;
  unitLabel: string;
}

/** Value first, then who and what — same hierarchy as the other tooltips. */
function WorkloadTooltip({ active, payload, color, unitLabel }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipKey} style={{ background: color }} />
      <span className={styles.tooltipValue}>{entry.count}</span>
      <span className={styles.tooltipLabel}>
        {unitLabel} · {entry.name}
      </span>
    </div>
  );
}

export default memo(WorkloadByAssigneeChart);
