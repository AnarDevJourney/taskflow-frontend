import { Checkbox, Modal } from "antd";
import { HolderOutlined } from "@ant-design/icons";
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
import styles from "./ColumnsModal.module.css";

export interface ColumnLike {
  id: string;
  visible: boolean;
  width?: number | null;
}

interface ColumnsModalProps<T extends ColumnLike> {
  open: boolean;
  title: string;
  hint: string;
  columns: T[];
  labels: Record<string, string>;
  onChange: (columns: T[]) => void;
  onClose: () => void;
}

// Generic checkbox + drag-to-reorder list — same pattern used by My Tasks'
// column customization and the sidebar's module customization. Any table
// that wants "show/hide + reorder columns" can reuse this instead of
// building its own dnd-kit wiring.
export default function ColumnsModal<T extends ColumnLike>({
  open,
  title,
  hint,
  columns,
  labels,
  onChange,
  onClose,
}: ColumnsModalProps<T>) {
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
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={420}>
      <p className={styles.hint}>{hint}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>
            {columns.map((column) => (
              <ColumnRow
                key={column.id}
                id={column.id}
                visible={column.visible}
                label={labels[column.id] ?? column.id}
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
  id,
  visible,
  label,
  onToggle,
}: {
  id: string;
  visible: boolean;
  label: string;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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
      <Checkbox checked={visible} onChange={onToggle} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
