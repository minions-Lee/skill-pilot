import { useMemo } from "react";
import { useSkillStore } from "../../store/useSkillStore";
import type { Profile } from "../../types/profile";

interface ProfileDetailProps {
  profile: Profile;
  onEdit: () => void;
  onApply: () => void;
  onBack: () => void;
}

export function ProfileDetail({ profile, onEdit, onApply, onBack }: ProfileDetailProps) {
  const skills = useSkillStore((s) => s.skills);
  const selectSkill = useSkillStore((s) => s.selectSkill);

  const profileSkills = useMemo(() => {
    return profile.skill_ids.map((id) => {
      const found = skills.find((s) => s.id === id || s.name === id);
      return { id, skill: found ?? null };
    });
  }, [profile.skill_ids, skills]);

  const foundCount = profileSkills.filter((s) => s.skill).length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 border-b border-[var(--color-border)]"
        style={{ padding: "8px 20px", flexShrink: 0 }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md text-[13px] text-[var(--color-text-secondary)]
                     hover:text-[var(--color-text)] transition-colors cursor-default"
          style={{ padding: "4px 8px", background: "none", border: "none" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="h-4 w-px bg-[var(--color-border)]" />
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: profile.color }}
        />
        <h1 className="text-[14px] font-semibold text-[var(--color-text)] truncate">
          {profile.name}
        </h1>
        {profile.is_preset && (
          <span
            className="shrink-0 inline-flex items-center rounded-full text-[11px] font-medium"
            style={{ padding: "2px 8px", backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Preset
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)]
                     text-[13px] text-[var(--color-text-secondary)]
                     hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]
                     transition-colors duration-150"
          style={{ padding: "4px 10px" }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onApply}
          className="flex items-center gap-1.5 rounded-md
                     text-[13px] font-medium
                     bg-[var(--color-accent)] text-[var(--color-bg)]
                     hover:opacity-90 transition-opacity duration-150"
          style={{ padding: "4px 10px" }}
        >
          Apply
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          {profile.description && (
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed" style={{ marginBottom: 16 }}>
              {profile.description}
            </p>
          )}

          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <h2 className="text-[13px] font-medium text-[var(--color-text)]">
              Skills ({profile.skill_ids.length})
            </h2>
            <span className="text-[12px] text-[var(--color-text-muted)]">
              {foundCount} found in repository
            </span>
          </div>

          <div className="space-y-1.5">
            {profileSkills.map(({ id, skill }) => (
              <div
                key={id}
                role={skill ? "button" : undefined}
                tabIndex={skill ? 0 : undefined}
                onClick={() => skill && selectSkill(skill.id)}
                className={`flex items-center gap-3 rounded-lg border border-[var(--color-border)]
                           transition-colors duration-100 ${
                             skill
                               ? "hover:bg-[var(--color-surface-hover)] cursor-default"
                               : "opacity-50"
                           }`}
                style={{ padding: "10px 14px" }}
              >
                {/* Status indicator */}
                {skill ? (
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        skill.link_status_user === "Active" || skill.link_status_user === "Direct"
                          ? "var(--color-success)"
                          : skill.link_status_user === "Broken"
                          ? "var(--color-warning)"
                          : "var(--color-text-muted)",
                    }}
                    title={skill.link_status_user}
                  />
                ) : (
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: "var(--color-danger)", opacity: 0.5 }}
                    title="Not found in repository"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--color-text)] truncate">
                      {skill?.name ?? id}
                    </span>
                    {skill && (
                      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                        {skill.source_repo.split("/").pop()}
                      </span>
                    )}
                  </div>
                  {skill ? (
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">
                      {skill.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--color-danger)] mt-0.5">
                      Not found in repository
                    </p>
                  )}
                </div>

                {/* Link status badge */}
                {skill && (
                  <span
                    className="shrink-0 text-[11px] font-medium rounded-full"
                    style={{
                      padding: "2px 8px",
                      backgroundColor:
                        skill.link_status_user === "Active" || skill.link_status_user === "Direct"
                          ? "rgba(76, 183, 130, 0.15)"
                          : "rgba(94, 95, 99, 0.15)",
                      color:
                        skill.link_status_user === "Active" || skill.link_status_user === "Direct"
                          ? "var(--color-success)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    {skill.link_status_user}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
