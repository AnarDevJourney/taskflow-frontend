import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spin } from "antd";
import {
  SearchOutlined,
  ProjectOutlined,
  CheckSquareOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { searchService } from "../services/searchService";
import { Task, Project, User } from "@types/index";
import { useDebounce } from "@hooks/useDebounce";
import styles from "./SearchOverlay.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

type ResultItem =
  | { type: "task"; data: Task }
  | { type: "project"; data: Project }
  | { type: "member"; data: User };

export default function SearchOverlay({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery, workspaceId],
    queryFn: () => searchService.global(debouncedQuery, workspaceId ?? ""),
    enabled: debouncedQuery.length >= 2 && !!workspaceId,
    staleTime: 10_000,
  });

  // flatten all results into one list for keyboard navigation
  const allItems: ResultItem[] = [
    ...(data?.tasks.map((t) => ({ type: "task" as const, data: t })) ?? []),
    ...(data?.projects.map((p) => ({ type: "project" as const, data: p })) ??
      []),
    ...(data?.members.map((m) => ({ type: "member" as const, data: m })) ?? []),
  ];

  const handleSelect = useCallback(
    (item: ResultItem) => {
      onClose();
      if (item.type === "task") {
        const projectId =
          typeof item.data.projectId === "object"
            ? (item.data.projectId as unknown as { _id: string })._id
            : item.data.projectId;
        navigate(
          `/workspaces/${workspaceId}/projects/${projectId}/board`,
        );
      } else if (item.type === "project") {
        navigate(`/workspaces/${workspaceId}/projects/${item.data._id}/board`);
      }
    },
    [navigate, workspaceId, onClose],
  );

  // keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems[activeIndex]) {
      handleSelect(allItems[activeIndex]);
    }
  };

  const showResults = query.length >= 2;
  const hasResults =
    (data?.tasks.length ?? 0) +
      (data?.projects.length ?? 0) +
      (data?.members.length ?? 0) >
    0;

  let globalIndex = 0;

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className={styles.inputWrap}>
          <SearchOutlined className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Search tasks, projects, members…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          {isFetching ? (
            <Spin size="small" />
          ) : (
            <span className={styles.escHint}>ESC</span>
          )}
        </div>

        {/* Results */}
        <div className={styles.results}>
          {!showResults ? (
            <div className={styles.empty}>
              Type at least 2 characters to search
            </div>
          ) : !hasResults && !isFetching ? (
            <div className={styles.empty}>
              No results for "<strong>{query}</strong>"
            </div>
          ) : (
            <>
              {/* Tasks */}
              {(data?.tasks.length ?? 0) > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Tasks</div>
                  {data!.tasks.map((task) => {
                    const idx = globalIndex++;
                    return (
                      <div
                        key={task._id}
                        className={`${styles.item} ${activeIndex === idx ? styles.active : ""}`}
                        onClick={() =>
                          handleSelect({ type: "task", data: task })
                        }
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div className={styles.itemIcon}>
                          <CheckSquareOutlined />
                        </div>
                        <div className={styles.itemContent}>
                          <div className={styles.itemTitle}>{task.title}</div>
                          <div className={styles.itemSub}>
                            {task.status} · {task.priority}
                          </div>
                        </div>
                        <span className={styles.itemKey}>
                          #{task.taskNumber}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Projects */}
              {(data?.projects.length ?? 0) > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Projects</div>
                  {data!.projects.map((project) => {
                    const idx = globalIndex++;
                    return (
                      <div
                        key={project._id}
                        className={`${styles.item} ${activeIndex === idx ? styles.active : ""}`}
                        onClick={() =>
                          handleSelect({ type: "project", data: project })
                        }
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div
                          className={styles.itemIcon}
                          style={{
                            background: `${project.color}20`,
                            color: project.color,
                          }}
                        >
                          <ProjectOutlined />
                        </div>
                        <div className={styles.itemContent}>
                          <div className={styles.itemTitle}>{project.name}</div>
                          <div className={styles.itemSub}>{project.key}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Members */}
              {(data?.members.length ?? 0) > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Members</div>
                  {data!.members.map((member) => {
                    const idx = globalIndex++;
                    return (
                      <div
                        key={member._id}
                        className={`${styles.item} ${activeIndex === idx ? styles.active : ""}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <div
                          className={styles.itemIcon}
                          style={{ background: "#f6ffed", color: "#52c41a" }}
                        >
                          <UserOutlined />
                        </div>
                        <div className={styles.itemContent}>
                          <div className={styles.itemTitle}>{member.name}</div>
                          <div className={styles.itemSub}>{member.email}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className={styles.footer}>
          <span className={styles.hint}>
            <kbd className={styles.kbd}>↑↓</kbd> navigate
          </span>
          <span className={styles.hint}>
            <kbd className={styles.kbd}>↵</kbd> select
          </span>
          <span className={styles.hint}>
            <kbd className={styles.kbd}>ESC</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
