import { memo, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import styles from "./DashboardDonutChart.module.css";

export interface DonutDatum {
  /** stable identity — drives the color lookup, never the array position */
  id: string;
  label: string;
  value: number;
}

interface Props {
  title: string;
  /** the number written in the middle of the ring */
  total: number;
  /** caption under the centre total, e.g. "tasks" */
  totalLabel: string;
  data: DonutDatum[];
  /** color per datum id — a slice keeps its hue when others empty out */
  colors: Record<string, string>;
}

/** matches the 300ms the rest of the dashboard's transitions use */
const ANIMATION_MS = 300;

// Recharts defaults to a 400ms delay before the entrance animation starts,
// which is longer than the animation itself and reads as the chart failing
// to load. The ring draws immediately instead.
const ANIMATION_BEGIN_MS = 0;

const RADIUS = { inner: 58, outer: 84 };

/**
 * The dashboard's donut. Both charts on the page are this component with
 * different props — there is no second pie implementation.
 *
 * Three things it does deliberately:
 *
 *  - **The legend is the table view.** Every slice's label, count and share
 *    are printed underneath the ring, so no value is reachable only by
 *    hovering. The tooltip enhances; it never gates.
 *  - **Color follows identity.** `colors` is keyed by `datum.id`, not by
 *    index, so a slice that drops to zero doesn't repaint the others.
 *  - **The gap does the separating.** Segments are held apart by a 2°
 *    `paddingAngle` showing the card surface through, not by a stroke drawn
 *    around each arc.
 *
 * Memoized because the two charts re-render whenever anything else on the
 * dashboard changes (a checkbox toggling, a refetch landing) while their own
 * props usually have not.
 */
function DashboardDonutChart({ title, total, totalLabel, data, colors }: Props) {
  const { t } = useTranslation();

  // Recharts wants a flat array with a numeric key, and it re-reads `data` on
  // every render — building it inline would hand it a new array identity each
  // time and restart the animation.
  const chartData = useMemo(
    () => data.filter((d) => d.value > 0).map((d) => ({ ...d, share: total > 0 ? d.value / total : 0 })),
    [data, total],
  );

  // a single slice has nothing to be separated from, and a padding angle on
  // one arc renders as a notch cut out of a full ring
  const paddingAngle = chartData.length > 1 ? 2 : 0;

  const isEmpty = total === 0 || chartData.length === 0;

  return (
    <section className={styles.card} aria-label={title}>
      <h3 className={styles.title}>{title}</h3>

      <div className={styles.chartArea}>
        {isEmpty ? (
          <div className={styles.emptyRing} role="img" aria-label={t("dashboardPage.charts.empty")}>
            <span className={styles.emptyText}>{t("dashboardPage.charts.empty")}</span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={RADIUS.inner}
                  outerRadius={RADIUS.outer}
                  paddingAngle={paddingAngle}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  animationBegin={ANIMATION_BEGIN_MS}
                  animationDuration={ANIMATION_MS}
                  isAnimationActive
                >
                  {chartData.map((datum) => (
                    <Cell key={datum.id} fill={colors[datum.id]} />
                  ))}
                </Pie>
                <Tooltip
                  content={<DonutTooltip colors={colors} />}
                  wrapperStyle={{ outline: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centre total. Absolutely positioned HTML rather than an SVG
                <Label> so it inherits the theme's text tokens directly. */}
            <div className={styles.centre} aria-hidden="true">
              <div className={styles.centreValue}>{total}</div>
              <div className={styles.centreLabel}>{totalLabel}</div>
            </div>
          </>
        )}
      </div>

      {/* Custom legend, below the ring. Doubles as the chart's table view —
          every slice's exact count and share is readable without hovering. */}
      <ul className={styles.legend}>
        {data.map((datum) => (
          <li key={datum.id} className={styles.legendRow}>
            <span
              className={styles.swatch}
              style={{ background: colors[datum.id] }}
              aria-hidden="true"
            />
            <span className={styles.legendLabel}>{datum.label}</span>
            <span className={styles.legendValue}>{datum.value}</span>
            <span className={styles.legendShare}>
              {total > 0 ? `${Math.round((datum.value / total) * 100)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: DonutDatum & { share: number } }[];
  colors: Record<string, string>;
}

/**
 * Value first, label second — the reader already knows which slice they are
 * pointing at and wants the number. The series is keyed by a short colored
 * stroke rather than a filled box, and the label itself wears a text token,
 * never the slice color.
 */
function DonutTooltip({ active, payload, colors }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;

  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipKey} style={{ background: colors[datum.id] }} />
      <span className={styles.tooltipValue}>{datum.value}</span>
      <span className={styles.tooltipLabel}>{datum.label}</span>
      <span className={styles.tooltipShare}>{Math.round(datum.share * 100)}%</span>
    </div>
  );
}

export default memo(DashboardDonutChart);
