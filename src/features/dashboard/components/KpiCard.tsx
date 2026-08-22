import { memo, ReactNode } from "react";
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from "@ant-design/icons";
import { DashboardKpi } from "@types/index";
import styles from "./KpiCard.module.css";

interface Props {
  icon: ReactNode;
  /** icon tint — one of the semantic tokens, passed as a `var(--…)` string */
  accent: string;
  value: number;
  label: string;
  kpi: DashboardKpi;
  /** the period the comparison is against, already translated */
  periodLabel: string;
  /**
   * Whether a rising number is good news. Completed tasks going up is good;
   * overdue tasks going up is not — the chip colors by meaning, not by sign.
   */
  higherIsBetter: boolean;
}

/**
 * A stat tile: label, value, and an optional comparison chip.
 *
 * The chip is hidden entirely when `changePercent` is null — the backend
 * sends null when the previous period had no baseline to divide by, and a
 * card is more honest with no chip than with a fabricated "+100%".
 */
function KpiCard({
  icon,
  accent,
  value,
  label,
  kpi,
  periodLabel,
  higherIsBetter,
}: Props) {
  const change = kpi.changePercent;
  const hasChange = change !== null && change !== undefined;
  const isFlat = change === 0;
  const isUp = (change ?? 0) > 0;
  const isGood = isUp === higherIsBetter;

  const chipClass = isFlat
    ? styles.chipFlat
    : isGood
      ? styles.chipGood
      : styles.chipBad;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span
          className={styles.icon}
          style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>

      {hasChange && (
        <div className={`${styles.chip} ${chipClass}`}>
          {/* an icon and the period text ride along, so the direction never
              rests on color alone */}
          {isFlat ? (
            <MinusOutlined />
          ) : isUp ? (
            <ArrowUpOutlined />
          ) : (
            <ArrowDownOutlined />
          )}
          <span className={styles.chipValue}>
            {isUp ? "+" : ""}
            {change}%
          </span>
          <span className={styles.chipPeriod}>{periodLabel}</span>
        </div>
      )}
    </article>
  );
}

export default memo(KpiCard);
