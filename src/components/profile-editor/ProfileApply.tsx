import { useState, useCallback } from "react";
import type { Profile } from "../../types/profile";
import { useProjectStore } from "../../store/useProjectStore";

type ApplyLevel = "user" | "project";

interface ProfileApplyProps {
  profile: Profile;
  onApply: (profileId: string, targetPaths: (string | null)[]) => void;
  onClose: () => void;
}

export function ProfileApply({ profile, onApply, onClose }: ProfileApplyProps) {
  const projects = useProjectStore((s) => s.projects);

  const [level, setLevel] = useState<ApplyLevel>("user");
  // Pre-select projects that already have this profile assigned
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() =>
    projects.filter((p) => p.profile_ids.includes(profile.id)).map((p) => p.id)
  );

  const handleToggleProject = useCallback((projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  }, [selectedProjectIds.length, projects]);

  const handleApply = useCallback(() => {
    if (level === "user") {
      onApply(profile.id, [null]);
    } else {
      const paths = selectedProjectIds
        .map((pid) => projects.find((p) => p.id === pid))
        .filter(Boolean)
        .map((p) => p!.path);
      if (paths.length > 0) {
        onApply(profile.id, paths);
      }
    }
  }, [level, profile.id, selectedProjectIds, projects, onApply]);

  const canApply = level === "user" || selectedProjectIds.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            Apply Profile
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
        <div className="px-4 py-3 space-y-3">
          {/* Profile info */}
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: profile.color }}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--color-text)] truncate">
                {profile.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {profile.skill_ids.length} skill{profile.skill_ids.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Level selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Target Level
            </label>

            {/* User level */}
            <label
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
                level === "user"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <input
                type="radio"
                name="apply-level"
                value="user"
                checked={level === "user"}
                onChange={() => setLevel("user")}
                className="sr-only"
              />
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 ${
                  level === "user"
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-text-muted)]"
                }`}
              >
                {level === "user" && (
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                )}
              </span>
              <div>
                <p className="text-[13px] text-[var(--color-text)]">User Level</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  ~/.claude/skills/
                </p>
              </div>
            </label>

            {/* Project level */}
            <label
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
                level === "project"
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-dim)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              <input
                type="radio"
                name="apply-level"
                value="project"
                checked={level === "project"}
                onChange={() => setLevel("project")}
                className="sr-only"
              />
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0 ${
                  level === "project"
                    ? "border-[var(--color-accent)]"
                    : "border-[var(--color-text-muted)]"
                }`}
              >
                {level === "project" && (
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                )}
              </span>
              <div>
                <p className="text-[13px] text-[var(--color-text)]">Project Level</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Selected project directories
                </p>
              </div>
            </label>
          </div>

          {/* Project selector (if project level) — multi-select checkboxes */}
          {level === "project" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  Projects
                </label>
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-[var(--color-accent)] hover:underline"
                  >
                    {selectedProjectIds.length === projects.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                )}
              </div>
              {projects.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic">
                  No projects configured. Add one in Project Binder first.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
                  {projects.map((p) => {
                    const checked = selectedProjectIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 cursor-pointer
                                   transition-colors duration-100
                                   ${checked ? "bg-[var(--color-accent-dim)]" : "hover:bg-[var(--color-surface-hover)]"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleProject(p.id)}
                          className="accent-[var(--color-accent)] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] text-[var(--color-text)] truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                            {p.path}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
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
            onClick={handleApply}
            disabled={!canApply}
            className="rounded-md px-4 py-1.5 text-[13px] font-medium
                       bg-[var(--color-accent)] text-[var(--color-bg)]
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-opacity duration-150"
          >
            Apply{level === "project" && selectedProjectIds.length > 1
              ? ` (${selectedProjectIds.length})`
              : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
