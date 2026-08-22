import { ReactNode } from "react";
import { Empty } from "antd";
import styles from "./WidgetCard.module.css";

interface Props {
  title: string;
  /** optional pill on the right of the header, e.g. "5 left" */
  badge?: ReactNode;
  /** shown instead of `children` when the widget has nothing to list */
  emptyText: string;
  isEmpty: boolean;
  children: ReactNode;
}

/**
 * The shell every list widget on the dashboard shares — same surface spec as
 * the chart cards (16px radius, hairline border, minimal shadow), same
 * header layout, same empty state. The three widgets differ only in what
 * they render as rows.
 */
export default function WidgetCard({
  title,
  badge,
  emptyText,
  isEmpty,
  children,
}: Props) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {badge != null && <span className={styles.badge}>{badge}</span>}
      </header>

      {isEmpty ? (
        <div className={styles.empty}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
        </div>
      ) : (
        <ul className={styles.list}>{children}</ul>
      )}
    </section>
  );
}
