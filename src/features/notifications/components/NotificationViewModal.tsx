import { Modal } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { NOTIFICATION_VIEWS, NotificationViewId } from "../utils/notificationViews";
import styles from "./NotificationViewModal.module.css";

interface NotificationViewModalProps {
  open: boolean;
  value: NotificationViewId;
  onSelect: (view: NotificationViewId) => void;
  onClose: () => void;
}

// Same "customize table" pattern as Activity Log's ActivityViewModal — a
// grid of cards, each with a tiny CSS-only mockup so the variants are
// visually distinguishable at a glance, not just by name.
export default function NotificationViewModal({ open, value, onSelect, onClose }: NotificationViewModalProps) {
  const { t } = useTranslation();

  return (
    <Modal title={t("notificationsPage.viewModalTitle")} open={open} onCancel={onClose} footer={null} width={760}>
      <p className={styles.hint}>{t("notificationsPage.viewModalHint")}</p>
      <div className={styles.grid}>
        {NOTIFICATION_VIEWS.map((view) => {
          const selected = view.id === value;
          return (
            <div
              key={view.id}
              className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
              onClick={() => {
                onSelect(view.id);
                onClose();
              }}
            >
              {selected && <CheckCircleFilled className={styles.selectedIcon} />}
              <div className={styles.preview}>
                <ViewPreview id={view.id} />
              </div>
              <div className={styles.cardLabel}>{t(view.nameKey)}</div>
              <div className={styles.cardDesc}>{t(view.descKey)}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function ViewPreview({ id }: { id: NotificationViewId }) {
  switch (id) {
    case "classic":
      return (
        <div className={styles.mockTable}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.mockRow} />
          ))}
        </div>
      );
    case "compact":
      return (
        <div className={styles.mockTable}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`${styles.mockRow} ${styles.mockRowThin}`} />
          ))}
        </div>
      );
    case "striped":
      return (
        <div className={styles.mockTable}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${styles.mockRow} ${i % 2 === 1 ? styles.mockRowStriped : ""}`} />
          ))}
        </div>
      );
    case "minimal":
      return (
        <div className={styles.mockMinimal}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.mockLine} />
          ))}
        </div>
      );
    case "colorful":
      return (
        <div className={styles.mockTable}>
          {["#4a6cf7", "#10B981", "#fa8c16"].map((c, i) => (
            <div key={i} className={styles.mockColorRow} style={{ borderLeftColor: c }} />
          ))}
        </div>
      );
    case "spreadsheet":
      return (
        <div className={styles.mockSpreadsheet}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.mockGridRow}>
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className={styles.mockGridCell} />
              ))}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
