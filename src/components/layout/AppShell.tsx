import { type ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { TitleBar } from "./TitleBar";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  onRefresh: () => void;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 220;

export function AppShell({ sidebar, main, onRefresh }: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      <TitleBar onRefresh={onRefresh} />

      <div
        className="flex-1 flex min-h-0"
      >
        {/* Left sidebar */}
        <aside
          className="min-h-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)] shrink-0"
          style={{ width: sidebarWidth }}
        >
          {sidebar}
        </aside>

        {/* Resize handle */}
        <div
          data-sb="resize-handle"
          onMouseDown={handleMouseDown}
        />

        {/* Main area */}
        <main className="relative min-h-0 overflow-y-auto flex-1">
          {main}
        </main>
      </div>
    </div>
  );
}
