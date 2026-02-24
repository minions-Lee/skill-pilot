import { type ReactNode } from "react";
import { useRemoteStore } from "../../store/useRemoteStore";

interface TitleBarProps {
  onRefresh: () => void;
  children?: ReactNode;
}

export function TitleBar({ onRefresh }: TitleBarProps) {
  const activeServer = useRemoteStore((s) => s.getActiveServer());
  const titleText = activeServer
    ? `SkillPilot — ${activeServer.name}`
    : "SkillPilot";
  return (
    <header
      data-tauri-drag-region
      className="relative flex items-center justify-center shrink-0 border-b border-[var(--color-border)]"
      style={{ height: "var(--titlebar-height)" }}
    >
      {/* Traffic-light spacer (macOS window controls occupy ~70px on the left) */}
      <div className="w-[70px] shrink-0" />

      {/* Centered app name */}
      <div
        data-tauri-drag-region
        className="flex-1 flex items-center justify-center select-none pointer-events-none"
      >
        <span className="text-[12px] font-medium text-[var(--color-text-muted)] tracking-wide">
          {titleText}
        </span>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-1 pr-3 shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh skills"
          className="flex items-center justify-center w-7 h-7 rounded-md
                     text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]
                     hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)]
                     transition-colors duration-100 cursor-default"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
