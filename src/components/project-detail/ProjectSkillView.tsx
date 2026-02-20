import { useMemo, useCallback } from "react";
import { useSkillStore } from "../../store/useSkillStore";
import { useProfileStore } from "../../store/useProfileStore";
import { toggleSkillUserLevel, recordToggle } from "../../utils/tauri";
import type { ProjectConfig } from "../../types/project";
import type { Skill } from "../../types/skill";

interface ProjectSkillViewProps {
  project: ProjectConfig;
  onEdit: () => void;
  onBack: () => void;
}

interface SkillEntry {
  skill: Skill | null;
  sid: string;
  source: string; // profile name or "Extra"
  sourceColor?: string;
}

export function ProjectSkillView({ project, onEdit, onBack }: ProjectSkillViewProps) {
  const skills = useSkillStore((s) => s.skills);
  const updateSkillLinkStatus = useSkillStore((s) => s.updateSkillLinkStatus);
  const profiles = useProfileStore((s) => s.profiles);

  const entries = useMemo(() => {
    const result: SkillEntry[] = [];
    const seen = new Set<string>();

    // Skills from assigned profiles
    for (const pid of project.profile_ids) {
      const profile = profiles.find((p) => p.id === pid);
      if (!profile) continue;
      for (const sid of profile.skill_ids) {
        if (seen.has(sid)) continue;
        seen.add(sid);
        const found = skills.find((s) => s.id === sid || s.name === sid);
        result.push({
          skill: found ?? null,
          sid,
          source: profile.name,
          sourceColor: profile.color,
        });
      }
    }

    // Extra skills
    for (const sid of project.extra_skill_ids) {
      if (seen.has(sid)) continue;
      seen.add(sid);
      const found = skills.find((s) => s.id === sid || s.name === sid);
      result.push({ skill: found ?? null, sid, source: "Extra" });
    }

    return result;
  }, [project, profiles, skills]);

  const handleToggle = useCallback(
    async (skill: Skill) => {
      const isActive =
        skill.link_status_user === "Active" || skill.link_status_user === "Direct";
      try {
        const newStatus = await toggleSkillUserLevel(
          skill.name,
          skill.source_path,
          isActive
        );
        updateSkillLinkStatus(skill.name, newStatus as Skill["link_status_user"]);
        await recordToggle(skill.name, !isActive);
      } catch (err) {
        console.error("Toggle failed:", err);
      }
    },
    [updateSkillLinkStatus]
  );

  const activeCount = entries.filter(
    (e) =>
      e.skill &&
      (e.skill.link_status_user === "Active" || e.skill.link_status_user === "Direct")
  ).length;

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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)] shrink-0">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <div className="min-w-0">
          <h1 className="text-[14px] font-semibold text-[var(--color-text)] truncate">
            {project.name}
          </h1>
          <p className="text-[11px] text-[var(--color-text-muted)] truncate">{project.path}</p>
        </div>
        <div className="flex-1" />
        <span className="text-[12px] text-[var(--color-text-muted)]">
          {activeCount}/{entries.length} active
        </span>
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
      </div>

      {/* Skill list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No skills configured for this project.
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                Click Edit to assign profiles or add extra skills.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map(({ sid, skill, source, sourceColor }) => {
                const isActive =
                  skill &&
                  (skill.link_status_user === "Active" ||
                    skill.link_status_user === "Direct");

                return (
                  <div
                    key={sid}
                    className={`flex items-center gap-3 rounded-lg border border-[var(--color-border)]
                               transition-colors duration-100 ${
                                 skill ? "" : "opacity-50"
                               }`}
                    style={{ padding: "10px 14px" }}
                  >
                    {/* Toggle switch */}
                    <button
                      type="button"
                      disabled={!skill}
                      onClick={() => skill && handleToggle(skill)}
                      className="shrink-0 relative w-8 h-[18px] rounded-full transition-colors duration-200 cursor-default disabled:opacity-40"
                      style={{
                        backgroundColor: isActive
                          ? "var(--color-success)"
                          : "var(--color-border)",
                      }}
                      title={isActive ? "Disable" : "Enable"}
                    >
                      <span
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200"
                        style={{
                          left: isActive ? 15 : 2,
                        }}
                      />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[var(--color-text)] truncate">
                          {skill?.name ?? sid}
                        </span>
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

                    {/* Source badge */}
                    <span
                      className="shrink-0 text-[11px] font-medium rounded-full"
                      style={{
                        padding: "2px 8px",
                        backgroundColor: sourceColor
                          ? `${sourceColor}20`
                          : "rgba(94, 95, 99, 0.15)",
                        color: sourceColor ?? "var(--color-text-muted)",
                      }}
                    >
                      {source}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
