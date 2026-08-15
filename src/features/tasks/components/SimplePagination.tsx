import { Button } from "antd";
import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import styles from "./SimplePagination.module.css";

interface SimplePaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

// First page ⏮ | ◀ prev | page-1  page  page+1 | next ▶ | ⏭ last page
export default function SimplePagination({ page, totalPages, onChange }: SimplePaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className={styles.pagination}>
      <Button
        icon={<DoubleLeftOutlined />}
        disabled={page === 1}
        onClick={() => onChange(1)}
      />
      <Button icon={<LeftOutlined />} disabled={page === 1} onClick={() => onChange(page - 1)} />

      {pages.map((p) => (
        <Button
          key={p}
          type={p === page ? "primary" : "default"}
          onClick={() => onChange(p)}
        >
          {p}
        </Button>
      ))}

      <Button
        icon={<RightOutlined />}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      />
      <Button
        icon={<DoubleRightOutlined />}
        disabled={page === totalPages}
        onClick={() => onChange(totalPages)}
      />
    </div>
  );
}
