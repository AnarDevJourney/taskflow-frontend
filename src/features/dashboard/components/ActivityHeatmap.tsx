import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { DashboardActivityHeatmap } from "@types/index";
import {
  HEATMAP_LEVEL_COUNT,
  heatmapLevelColors,
  ResolvedTheme,
} from "../utils/chartPalette";
import styles from "./ActivityHeatmap.module.css";

interface Props {
  heatmap: DashboardActivityHeatmap;
  theme: ResolvedTheme;
}

const DAYS_PER_WEEK = 7;

/** which rows get a weekday label — all seven would crowd at this cell size */
const LABELLED_ROWS = new Set([0, 2, 4]);

/** how close to the card's right edge before the tooltip anchors right instead */
const TOOLTIP_FLIP_MARGIN_PX = 180;

interface HoverState {
  date: string;
  count: number;
  left: number;
  top: number;
  /** anchor the tooltip's right edge, so it can't run off the card */
  alignEnd: boolean;
}

/**
 * A contribution grid: one cell per day, one column per week, colour by how
 * much happened that day.
 *
 * Built as a CSS grid rather than with Recharts — there is no heatmap
 * primitive there, and a grid of divs gives crisper small cells, real text
 * labels and theme colours straight from the tokens.
 *
 * Every date in the grid comes from the server (`heatmap.days`), already
 * zero-filled and in reading order, so this component does no date
 * arithmetic beyond formatting: the counts are bucketed into *server*
 * calendar days, and a client generating its own scaffold in another
 * timezone would slide counts into the wrong cells.
 */
function ActivityHeatmap({ heatmap, theme }: Props) {
  const { t } = useTranslation();
  const levels = heatmapLevelColors(theme);
  const cardRef = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const { days, today } = heatmap;
  const weeks = Math.ceil(days.length / DAYS_PER_WEEK);

  const total = useMemo(
    () => days.reduce((sum, day) => sum + day.count, 0),
    [days],
  );

  /**
   * Busiest day in the window, which sets the top of the scale.
   *
   * This is a *colour-binning* decision rather than a dashboard statistic —
   * the counts themselves all come from the aggregation. Below five, the
   * count is used as the level directly: with a max of 1, a proportional
   * scale would paint every single-event day at full intensity and make a
   * quiet workspace look frantic.
   */
  const levelOf = useMemo(() => {
    const max = days.reduce((peak, day) => Math.max(peak, day.count), 0);

    return (count: number): number => {
      if (count <= 0) return 0;
      if (max <= HEATMAP_LEVEL_COUNT) return Math.min(count, HEATMAP_LEVEL_COUNT);
      return Math.min(
        HEATMAP_LEVEL_COUNT,
        Math.ceil((count / max) * HEATMAP_LEVEL_COUNT),
      );
    };
  }, [days]);

  /**
   * Month captions above the first week each month opens in. Derived from
   * the week's Monday, so a month that starts mid-week is captioned on the
   * column its first days actually appear in.
   */
  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let previousMonth = -1;

    for (let week = 0; week < weeks; week++) {
      const monday = days[week * DAYS_PER_WEEK];
      if (!monday) continue;

      const month = dayjs(monday.date).month();
      if (month !== previousMonth) {
        previousMonth = month;
        // the final column is often a sliver — a caption there would collide
        // with the previous one
        if (week < weeks - 1) {
          labels.push({ week, label: dayjs(monday.date).format("MMM") });
        }
      }
    }
    return labels;
  }, [days, weeks]);

  const gridVars = useMemo(
    () => ({ "--weeks": weeks }) as React.CSSProperties,
    [weeks],
  );

  /**
   * One delegated handler for the whole grid rather than a pair per cell.
   *
   * With 371 cells, per-cell handlers meant every crossing between two cells
   * re-rendered all of them; the grid element below is memoized so it is
   * built once, and hovering now only re-renders the tooltip.
   */
  const handlePointerOver = useCallback((event: React.PointerEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-date]");
    const card = cardRef.current;
    if (!cell || !card || cell.dataset.future === "true") {
      setHover(null);
      return;
    }

    // measured against the card, not the scrolling grid, so the tooltip can
    // sit outside the scroller instead of being clipped by its overflow
    const cellRect = cell.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left = cellRect.left - cardRect.left + cellRect.width / 2;

    setHover({
      date: cell.dataset.date ?? "",
      count: Number(cell.dataset.count ?? 0),
      left,
      top: cellRect.top - cardRect.top,
      alignEnd: left > cardRect.width - TOOLTIP_FLIP_MARGIN_PX,
    });
  }, []);

  const handlePointerLeave = useCallback(() => setHover(null), []);

  /**
   * Memoized so the 371 cells are rendered once and reused by reference on
   * every hover — React skips the whole subtree when the element identity is
   * unchanged.
   */
  const grid = useMemo(
    () => (
      <div className={styles.grid} style={gridVars}>
        {days.map((day) => {
          const isFuture = day.date > today;

          return (
            <div
              key={day.date}
              className={`${styles.cell} ${isFuture ? styles.future : ""}`}
              style={isFuture ? undefined : { background: levels[levelOf(day.count)] }}
              data-date={day.date}
              data-count={day.count}
              data-future={isFuture ? "true" : undefined}
              // the count rides on the cell itself, so assistive tech reads
              // every value without needing the hover layer
              role="img"
              aria-label={cellLabel(day.date, day.count, t)}
            />
          );
        })}
      </div>
    ),
    [days, today, levels, levelOf, gridVars, t],
  );

  if (days.length === 0) {
    return (
      <section className={styles.card}>
        <h3 className={styles.title}>{t("dashboardPage.heatmap.title")}</h3>
        <p className={styles.empty}>{t("dashboardPage.heatmap.empty")}</p>
      </section>
    );
  }

  return (
    <section
      ref={cardRef}
      className={styles.card}
      aria-label={t("dashboardPage.heatmap.title")}
    >
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{t("dashboardPage.heatmap.title")}</h3>
          <p className={styles.subtitle}>{t("dashboardPage.heatmap.subtitle")}</p>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryValue}>{total}</span>
          <span className={styles.summaryLabel}>
            {t("dashboardPage.heatmap.totalLabel")}
          </span>
        </div>
      </header>

      {/* the grid keeps its cell proportions and scrolls sideways rather than
          shrinking cells to specks on a narrow screen */}
      <div
        className={styles.scroller}
        onPointerOver={handlePointerOver}
        onPointerLeave={handlePointerLeave}
      >
        <div className={styles.body}>
          <div className={styles.months} style={gridVars}>
            {monthLabels.map(({ week, label }) => (
              <span
                key={`${week}-${label}`}
                className={styles.monthLabel}
                style={{ gridColumn: week + 1 }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className={styles.chartRow}>
            <div className={styles.weekdays}>
              {Array.from({ length: DAYS_PER_WEEK }).map((_, row) => (
                <span key={row} className={styles.weekdayLabel}>
                  {LABELLED_ROWS.has(row)
                    ? // rows are Monday-first, dayjs weeks are Sunday-first;
                      // `dd` is the localized minimal weekday name
                      dayjs()
                        .day((row + 1) % DAYS_PER_WEEK)
                        .format("dd")
                    : ""}
                </span>
              ))}
            </div>

            {grid}
          </div>
        </div>
      </div>

      {hover && (
        <div
          className={`${styles.tooltip} ${hover.alignEnd ? styles.tooltipEnd : ""}`}
          style={{ left: hover.left, top: hover.top }}
        >
          <span className={styles.tooltipValue}>{hover.count}</span>
          <span className={styles.tooltipLabel}>
            {t("dashboardPage.heatmap.tooltipLabel")} ·{" "}
            {dayjs(hover.date).format("D MMMM YYYY")}
          </span>
        </div>
      )}

      {/* the scale legend — a sequential encoding needs one, and it is also
          how a reader learns what a pale cell means without hovering */}
      <footer className={styles.legend}>
        <span className={styles.legendText}>
          {t("dashboardPage.heatmap.less")}
        </span>
        {levels.map((color, level) => (
          <span
            key={level}
            className={styles.legendSwatch}
            style={{ background: color }}
            aria-hidden="true"
          />
        ))}
        <span className={styles.legendText}>
          {t("dashboardPage.heatmap.more")}
        </span>
      </footer>
    </section>
  );
}

function cellLabel(date: string, count: number, t: TFunction): string {
  const formatted = dayjs(date).format("D MMMM YYYY");
  return count === 0
    ? t("dashboardPage.heatmap.ariaEmpty", { date: formatted })
    : t("dashboardPage.heatmap.ariaCount", { value: count, date: formatted });
}

export default memo(ActivityHeatmap);
