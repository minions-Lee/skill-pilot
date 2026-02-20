import { useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useSkillStore } from "../../store/useSkillStore";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const repoPath = useSkillStore((s) => s.repoPath);
  const setRepoPath = useSkillStore((s) => s.setRepoPath);
  const scan = useSkillStore((s) => s.scan);

  const [path, setPath] = useState(repoPath);
  const [saving, setSaving] = useState(false);

  const handleBrowse = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected && typeof selected === "string") {
      setPath(selected);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!path.trim()) return;
    setSaving(true);
    setRepoPath(path.trim());
    // Small delay to let state update propagate, then rescan
    setTimeout(async () => {
      await scan();
      setSaving(false);
      onClose();
    }, 50);
  }, [path, setRepoPath, scan, onClose]);

  const hasChanged = path.trim() !== repoPath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)]
                       hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]
                       transition-colors duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Repo Path */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Skill Repository Path
            </label>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-2">
              The local directory containing all your skill folders and submodules.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/skills"
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                           px-3 py-1.5 text-[13px] text-[var(--color-text)] font-mono
                           placeholder:text-[var(--color-text-muted)]
                           focus:outline-none focus:border-[var(--color-accent)]
                           transition-colors duration-150"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="shrink-0 flex items-center gap-1.5 rounded-md border border-[var(--color-border)]
                           px-3 py-1.5 text-[13px] text-[var(--color-text-secondary)]
                           hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]
                           transition-colors duration-150"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Browse
              </button>
            </div>
          </div>

          {/* Info note */}
          {hasChanged && (
            <div
              className="flex items-start gap-2 rounded-md text-[12px]"
              style={{
                padding: "8px 10px",
                backgroundColor: "var(--color-warning)",
                color: "var(--color-bg)",
                opacity: 0.9,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>Saving will rescan all skills from the new path. This may take a moment.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-[13px]
                       text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]
                       transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!path.trim() || saving}
            className="rounded-md px-4 py-1.5 text-[13px] font-medium
                       bg-[var(--color-accent)] text-[var(--color-bg)]
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-opacity duration-150"
          >
            {saving ? "Scanning..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
