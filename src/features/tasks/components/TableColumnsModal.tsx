import { Checkbox, Modal } from "antd";
import { HolderOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COLUMN_LABEL_KEYS, ColumnSetting } from "./TaskListViews";
import styles from "./TableColumnsModal.module.css";

interface TableColumnsModalProps {
  open: boolean;
  columns: ColumnSetting[];
  onChange: (columns: ColumnSetting[]) => void;
  onClose: () => void;
}

export default function TableColumnsModal({ open, columns, onChange, onClose }: TableColumnsModalProps) {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(columns, oldIndex, newIndex));
  };

  const toggleVisible = (id: string) => {
    onChange(columns.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  };

  return (
    <Modal title={t("tableColumns.modalTitle")} open={open} onCancel={onClose} footer={null} width={420}>
      <p className={styles.hint}>{t("tableColumns.modalHint")}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>
            {columns.map((column) => (
              <ColumnRow
                key={column.id}
                column={column}
                label={t(COLUMN_LABEL_KEYS[column.id])}
                onToggle={() => toggleVisible(column.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  );
}

function ColumnRow({
  column,
  label,
  onToggle,
}: {
  column: ColumnSetting;
  label: string;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.row}>
      <span className={styles.handle} {...attributes} {...listeners}>
        <HolderOutlined />
      </span>
      <Checkbox checked={column.visible} onChange={onToggle} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
