import { Modal } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { TABLE_VIEWS, TableViewId } from "./TaskListViews";
import styles from "./TableViewModal.module.css";

interface TableViewModalProps {
  open: boolean;
  value: TableViewId;
  onSelect: (view: TableViewId) => void;
  onClose: () => void;
}

export default function TableViewModal({ open, value, onSelect, onClose }: TableViewModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("tableViews.modalTitle")}
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
    >
      <p className={styles.hint}>{t("tableViews.modalHint")}</p>
      <div className={styles.grid}>
        {TABLE_VIEWS.map((view) => {
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
              <div className={styles.cardLabel}>{t(view.labelKey)}</div>
              <div className={styles.cardDesc}>{t(view.descKey)}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// Tiny CSS-only mockups so each view is visually distinguishable at a glance.
function ViewPreview({ id }: { id: TableViewId }) {
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
    case "cards":
      return (
        <div className={styles.mockCardsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.mockMiniCard} />
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
          {["#f5222d", "#fa8c16", "#4a6cf7"].map((c, i) => (
            <div key={i} className={styles.mockColorRow} style={{ borderLeftColor: c }} />
          ))}
        </div>
      );
    case "avatar":
      return (
        <div className={styles.mockTable}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.mockAvatarRow}>
              <span className={styles.mockAvatar} />
              <span className={styles.mockRowInner} />
            </div>
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
    case "kanban":
      return (
        <div className={styles.mockKanban}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.mockKanbanCol}>
              <div className={styles.mockMiniCard} />
              <div className={styles.mockMiniCard} />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
