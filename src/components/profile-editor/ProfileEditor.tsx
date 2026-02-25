import { useState, useMemo, useCallback } from "react";
import type { Profile } from "../../types/profile";
import { useSkillStore } from "../../store/useSkillStore";

interface ProfileEditorProps {
  profile: Profile | null;
  onSave: (profile: Profile) => void | Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#5e6ad2", // indigo
  "#4cb782", // green
  "#f2994a", // amber
  "#eb5757", // red
  "#a77bca", // purple
  "#4da7c9", // cyan
  "#d4a259", // gold
  "#7c8ea6", // slate
];

export function ProfileEditor({ profile, onSave, onClose }: ProfileEditorProps) {
  const skills = useSkillStore((s) => s.skills);

  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [color, setColor] = useState(profile?.color ?? PRESET_COLORS[0]);
  const [skillIds, setSkillIds] = useState<string[]>(profile?.skill_ids ?? []);
  const [searchQuery, setSearchQuery] = useState("");

  // Build entries for ALL skillIds, including ones not found in the store
  const assignedEntries = useMemo(
    () =>
      skillIds.map((sid) => {
        const found = skills.find((s) => s.id === sid || s.name === sid);
        return { sid, skill: found ?? null };
      }),
    [skills, skillIds]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return skills
      .filter(
        (s) =>
          !skillIds.includes(s.name) &&
          !skillIds.includes(s.id) &&
          (s.name.toLowerCase().includes(q) ||
            (s.description ?? "").toLowerCase().includes(q) ||
            (s.tags ?? []).some((t) => t.toLowerCase().includes(q)))
      )
      .slice(0, 10);
  }, [skills, skillIds, searchQuery]);

  const handleAddSkill = useCallback((skillName: string) => {
    setSkillIds((prev) => [...prev, skillName]);
    setSearchQuery("");
  }, []);

  const handleRemoveSkill = useCallback((skillId: string, skillName: string) => {
    setSkillIds((prev) => prev.filter((id) => id !== skillId && id !== skillName));
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const saved: Profile = {
      id: profile?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      color,
      skill_ids: skillIds,
      is_preset: profile?.is_preset ?? false,
    };
    onSave(saved);
  }, [profile, name, description, color, skillIds, onSave]);

  const isNew = !profile;
  const canSave = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-h-[85vh] flex flex-col rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            {isNew ? "New Profile" : "Edit Profile"}
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
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Profile name"
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                         px-3 py-1.5 text-[13px] text-[var(--color-text)]
                         placeholder:text-[var(--color-text-muted)]
                         focus:outline-none focus:border-[var(--color-accent)]
                         transition-colors duration-150"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                         px-3 py-1.5 text-[13px] text-[var(--color-text)]
                         placeholder:text-[var(--color-text-muted)]
                         focus:outline-none focus:border-[var(--color-accent)]
                         transition-colors duration-150 resize-none"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Color
            </label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all duration-150 ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-[var(--color-bg)] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: c,
                    ...(color === c
                      ? ({ "--tw-ring-color": c } as React.CSSProperties)
                      : {}),
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Skills ({skillIds.length})
            </label>

            {/* Assigned skills */}
            {assignedEntries.length > 0 && (
              <div className="space-y-1 mb-3">
                {assignedEntries.map(({ sid, skill }) => (
                  <div
                    key={sid}
                    className={`flex items-center justify-between gap-2 rounded-md bg-[var(--color-surface)]
                               border border-[var(--color-border)] px-2.5 py-1.5 ${!skill ? "opacity-60" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-[var(--color-text)] truncate">
                        {skill?.name ?? sid}
                      </p>
                      {skill ? (
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {skill.source_repo}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[var(--color-danger)] truncate">
                          未在仓库中找到
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill?.id ?? sid, skill?.name ?? sid)}
                      className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-[var(--color-text-muted)]
                                 hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-hover)]
                                 transition-colors duration-150"
                      title={`Remove ${skill?.name ?? sid}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search to add */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills to add..."
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                           px-3 py-1.5 text-[13px] text-[var(--color-text)]
                           placeholder:text-[var(--color-text-muted)]
                           focus:outline-none focus:border-[var(--color-accent)]
                           transition-colors duration-150"
              />

              {/* Search results (inline list) */}
              {searchResults.length > 0 && (
                <div className="mt-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)]
                                max-h-48 overflow-y-auto">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddSkill(s.name)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left
                                 hover:bg-[var(--color-surface-hover)] transition-colors duration-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-accent)]">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-[13px] text-[var(--color-text)] truncate">{s.name}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                          {s.source_repo}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            disabled={!canSave}
            className="rounded-md px-4 py-1.5 text-[13px] font-medium
                       bg-[var(--color-accent)] text-[var(--color-bg)]
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-opacity duration-150"
          >
            {isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
