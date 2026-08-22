import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { DashboardTrendPoint } from "@types/index";
import {
  chartChromeColors,
  ResolvedTheme,
  trendChartColor,
} from "../utils/chartPalette";
import styles from "./ProductivityTrendChart.module.css";

interface Props {
  /** seven days, oldest first, already zero-filled by the backend */
  data: DashboardTrendPoint[];
  theme: ResolvedTheme;
}

/** same 300ms the donuts animate in */
const ANIMATION_MS = 300;
const ANIMATION_BEGIN_MS = 0;

const CHART_HEIGHT = 260;

/**
 * Tasks completed per day over the last week.
 *
 * One series, so no legend box — the card's title says what is plotted, and
 * the line takes the first categorical slot. The dashed rule is the window's
 * daily average, which is what turns a row of numbers into a read: it says
 * whether today was a good day without the reader having to hold six other
 * values in their head.
 *
 * Values are never gated behind the tooltip: the y-axis carries the scale,
 * the last point is directly labelled, and every point has a hover/focus
 * readout on top of that.
 */
function ProductivityTrendChart({ data, theme }: Props) {
  const { t } = useTranslation();
  const color = trendChartColor(theme);
  const chrome = chartChromeColors(theme);

  // dayjs' locale is kept in sync with the app language (see lib/i18n), so
  // the weekday abbreviations follow whatever the user picked
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label: dayjs(point.date).format("ddd"),
        fullDate: dayjs(point.date).format("D MMMM"),
      })),
    [data],
  );

  const total = useMemo(
    () => chartData.reduce((sum, point) => sum + point.count, 0),
    [chartData],
  );

  const average = useMemo(
    () => (chartData.length > 0 ? total / chartData.length : 0),
    [total, chartData.length],
  );

  const lastIndex = chartData.length - 1;

  if (chartData.length === 0) {
    return (
      <section className={styles.card}>
        <h3 className={styles.title}>{t("dashboardPage.trend.title")}</h3>
        <p className={styles.empty}>{t("dashboardPage.charts.empty")}</p>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-label={t("dashboardPage.trend.title")}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{t("dashboardPage.trend.title")}</h3>
          <p className={styles.subtitle}>{t("dashboardPage.trend.subtitle")}</p>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryValue}>{total}</span>
          <span className={styles.summaryLabel}>
            {t("dashboardPage.trend.totalLabel")}
          </span>
        </div>
      </header>

      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart
          data={chartData}
          margin={{ top: 16, right: 24, bottom: 4, left: 0 }}
        >
          {/* horizontal only, solid hairline — vertical rules would just
              repeat the seven x labels */}
          <CartesianGrid
            vertical={false}
            stroke={chrome.grid}
            strokeWidth={1}
          />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: chrome.grid }}
            tick={{ fontSize: 12, fill: chrome.axis }}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: chrome.axis }}
          />

          {/* the week's daily average — dashed because it is a reference
              level rather than data, which is the one place dashing carries
              meaning instead of noise */}
          <ReferenceLine
            y={average}
            stroke={chrome.axis}
            strokeDasharray="6 6"
            strokeOpacity={0.7}
            label={{
              value: t("dashboardPage.trend.average", {
                value: average.toFixed(1),
              }),
              position: "insideTopRight",
              fill: chrome.axis,
              fontSize: 11,
            }}
          />

          <Tooltip
            content={<TrendTooltip color={color} />}
            cursor={{ stroke: chrome.grid, strokeWidth: 1 }}
            wrapperStyle={{ outline: "none" }}
          />

          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            // 2px ring in the surface color so the hovered point stays
            // legible where it sits on the line
            activeDot={{ r: 5, fill: color, stroke: chrome.surface, strokeWidth: 2 }}
            animationBegin={ANIMATION_BEGIN_MS}
            animationDuration={ANIMATION_MS}
            isAnimationActive
            label={(props: EndLabelProps) =>
              renderEndLabel(props, lastIndex, color)
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

interface EndLabelProps {
  x?: number;
  y?: number;
  value?: number;
  index?: number;
}

/**
 * Direct-labels the endpoint only. A number beside every point is chaos and
 * goes unread; the last value is the one the card is actually about, and the
 * axis plus the tooltip carry the rest.
 */
function renderEndLabel(
  { x, y, value, index }: EndLabelProps,
  lastIndex: number,
  color: string,
) {
  if (index !== lastIndex || x == null || y == null) return <g />;

  return (
    <text
      x={x}
      y={y - 14}
      textAnchor="middle"
      fontSize={13}
      fontWeight={700}
      fill={color}
    >
      {value}
    </text>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { count: number; fullDate: string } }[];
  color: string;
}

/** Value first, date second — same hierarchy as the donuts' tooltip. */
function TrendTooltip({ active, payload, color }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipKey} style={{ background: color }} />
      <span className={styles.tooltipValue}>{point.count}</span>
      <span className={styles.tooltipLabel}>{point.fullDate}</span>
    </div>
  );
}

export default memo(ProductivityTrendChart);
