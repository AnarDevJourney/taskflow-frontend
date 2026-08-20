import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { InboxOutlined } from "@ant-design/icons";
import styles from "./FileDropZone.module.css";

interface Props {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  /** Optional replacement for the default icon + label body. */
  children?: ReactNode;
  hint?: string;
  label: string;
}

/**
 * Click-or-drop file picker. Deliberately not AntD's `Upload`: that component
 * wants to own the request, and this app's uploads go through the shared axios
 * instance so they inherit cookie auth and the 401-refresh interceptor.
 */
export default function FileDropZone({
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  children,
  hint,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    emit(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault(); // without this the browser opens the file itself
    if (!disabled) setDragging(true);
  };

  // The input is cleared here rather than in onChange so that picking the same
  // file twice in a row still fires a change event, without ever resetting an
  // input whose File the in-flight upload may still be reading from.
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  return (
    <button
      type="button"
      className={`${styles.zone} ${dragging ? styles.dragging : ""} ${
        disabled ? styles.disabled : ""
      }`}
      disabled={disabled}
      onClick={openPicker}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
    >
      {children ?? (
        <>
          <InboxOutlined className={styles.icon} />
          <span className={styles.label}>{label}</span>
          {hint && <span className={styles.hint}>{hint}</span>}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className={styles.input}
        onChange={(event) => emit(event.target.files)}
      />
    </button>
  );
}
