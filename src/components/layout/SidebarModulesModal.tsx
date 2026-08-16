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
import { SidebarModuleSetting } from "@features/sidebarSettings/services/sidebarSettingsService";
import styles from "./SidebarModulesModal.module.css";

interface SidebarModulesModalProps {
  open: boolean;
  modules: SidebarModuleSetting[];
  labels: Record<string, string>;
  onChange: (modules: SidebarModuleSetting[]) => void;
  onClose: () => void;
}

export default function SidebarModulesModal({
  open,
  modules,
  labels,
  onChange,
  onClose,
}: SidebarModulesModalProps) {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(modules, oldIndex, newIndex));
  };

  const toggleVisible = (id: string) => {
    onChange(modules.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)));
  };

  return (
    <Modal title={t("sidebarModules.modalTitle")} open={open} onCancel={onClose} footer={null} width={420}>
      <p className={styles.hint}>{t("sidebarModules.modalHint")}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.list}>
            {modules.map((mod) => (
              <ModuleRow
                key={mod.id}
                module={mod}
                label={labels[mod.id] ?? mod.id}
                onToggle={() => toggleVisible(mod.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </Modal>
  );
}

function ModuleRow({
  module,
  label,
  onToggle,
}: {
  module: SidebarModuleSetting;
  label: string;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
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
      <Checkbox checked={module.visible} onChange={onToggle} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
