import { useCallback, useEffect, useMemo, useState } from "react";
import { useSkillStore } from "../../store/useSkillStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useAgentDirStore } from "../../store/useAgentDirStore";
import {
  toggleSkillProjectLevel,
  recordToggle,
  getProjectSkillLinksAll,
} from "../../utils/tauri";
import type { ProjectConfig } from "../../types/project";
import type { LinkStatus } from "../../types/skill";

interface ProjectSkillViewProps {
  project: ProjectConfig;
  onEdit: () => void;
  onBack: () => void;
}

interface ProjectLink {
  name: string;
  target: string;
  status: LinkStatus;
  description: string;
  /** Reverse-lookup: which profile contains this skill, or "Extra" / "Manual" */
  source: string;
  sourceColor?: string;
}

export function ProjectSkillView({ project, onEdit, onBack }: ProjectSkillViewProps) {
  const skills = useSkillStore((s) => s.skills);
  const profiles = useProfileStore((s) => s.profiles);
  const enabledDirs = useAgentDirStore((s) => s.getActiveAgentDirs());

  // 选中的 agent dir（默认第一个 enabled dir）
  const [selectedDir, setSelectedDir] = useState<string>(() => enabledDirs[0]?.dir ?? ".claude");
  // allLinks: key = dir_name, value = raw links
  const [allLinks, setAllLinks] = useState<Record<string, [string, string, string][]>>({});
  const [loading, setLoading] = useState(false);

  // Refresh user-level skill link statuses on mount
  useEffect(() => {
    useSkillStore.getState().refreshStatuses();
  }, [project.id]);

  // Scan project's skills directories on mount / project switch
  useEffect(() => {
    if (!project.path) {
      setAllLinks({});
      return;
    }
    setLoading(true);
    getProjectSkillLinksAll(project.path)
      .then((data) => {
        setAllLinks(data);
        // 若当前 selectedDir 不在 data 中，切换到第一个有数据的 dir
        if (Object.keys(data).length > 0 && !(selectedDir in data)) {
          setSelectedDir(Object.keys(data)[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to scan project skills:", err);
        setAllLinks({});
      })
      .finally(() => setLoading(false));
  }, [project.id, project.path, profiles, skills]);

  // 将当前选中 dir 的原始数据转为 ProjectLink 对象
  const links = useMemo<ProjectLink[]>(() => {
    const entries = allLinks[selectedDir] ?? [];

    // Build reverse-lookup: skill name → profile
    const skillToProfile = new Map<string, { name: string; color?: string }>();
    for (const pid of project.profile_ids) {
      const profile = profiles.find((p) => p.id === pid);
      if (!profile) continue;
      for (const sid of profile.skill_ids) {
        const skill = skills.find((s) => s.id === sid || s.name === sid);
        const key = skill?.name ?? sid;
        if (!skillToProfile.has(key)) {
          skillToProfile.set(key, { name: profile.name, color: profile.color });
        }
      }
    }
    const extraSet = new Set(
      project.extra_skill_ids.map((sid) => {
        const skill = skills.find((s) => s.id === sid || s.name === sid);
        return skill?.name ?? sid;
      })
    );

    return entries.map(([name, target, status]) => {
      const found = skills.find((s) => s.name === name || s.id === name);
      const profileInfo = skillToProfile.get(name);
      const source = profileInfo
        ? profileInfo.name
        : extraSet.has(name)
          ? "Extra"
          : "Manual";

      return {
        name,
        target,
        status: status as LinkStatus,
        description: found?.description ?? target,
        source,
        sourceColor: profileInfo?.color,
      };
    });
  }, [allLinks, selectedDir, project.profile_ids, project.extra_skill_ids, profiles, skills]);

  const handleToggle = useCallback(
    async (link: ProjectLink) => {
      if (!project.path) return;
      const isActive = link.status === "Active" || link.status === "Direct";
      const found = skills.find((s) => s.name === link.name || s.id === link.name);
      const sourcePath = found?.source_path ?? link.target;

      try {
        const statusMap = await toggleSkillProjectLevel(
          link.name,
          sourcePath,
          project.path,
          isActive
        );
        // 取 selectedDir 目录的状态代表当前视图状态
        const newStatus: LinkStatus = (statusMap[selectedDir] ?? (isActive ? "Inactive" : "Active")) as LinkStatus;

        // 更新 allLinks 中该 dir 的数据
        setAllLinks((prev) => {
          const dirLinks = prev[selectedDir] ?? [];
          const updated = newStatus === "Inactive"
            ? dirLinks.filter(([n]) => n !== link.name)
            : dirLinks.map(([n, t, s]) => n === link.name ? [n, t, newStatus] as [string, string, string] : [n, t, s] as [string, string, string]);
          return { ...prev, [selectedDir]: updated };
        });
        await recordToggle(link.name, !isActive);
      } catch (err) {
        console.error("Toggle failed:", err);
      }
    },
    [project.path, skills, selectedDir]
  );

  const [search, setSearch] = useState("");

  const filteredLinks = useMemo(() => {
    if (!search.trim()) return links;
    const q = search.toLowerCase();
    return links.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
    );
  }, [links, search]);

  const activeCount = links.filter(
    (l) => l.status === "Active" || l.status === "Direct"
  ).length;

  const showDirTabs = enabledDirs.length > 1;

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
          {activeCount}/{links.length} active{search.trim() ? ` · ${filteredLinks.length} shown` : ""}
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

      {/* Agent dir tabs — 只在多个启用目录时显示 */}
      {showDirTabs && (
        <div
          className="flex items-center gap-1 border-b border-[var(--color-border)]"
          style={{ padding: "6px 20px", flexShrink: 0 }}
        >
          {enabledDirs.map((d) => (
            <button
              key={d.dir}
              type="button"
              onClick={() => setSelectedDir(d.dir)}
              className={`px-2.5 py-1 rounded text-[12px] font-mono transition-colors duration-100 cursor-default
                ${selectedDir === d.dir
                  ? "bg-[var(--color-surface-active)] text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                }`}
            >
              {d.dir}
              {allLinks[d.dir] && (
                <span className="ml-1.5 text-[10px] tabular-nums opacity-60">
                  {allLinks[d.dir].length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Skill list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
        <div className="mx-auto" style={{ maxWidth: 720 }}>
          {/* Search */}
          {links.length > 0 && (
            <div className="relative mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                           pl-8 pr-3 py-1.5 text-[13px] text-[var(--color-text)]
                           placeholder:text-[var(--color-text-muted)]
                           focus:outline-none focus:border-[var(--color-accent)]
                           transition-colors duration-150"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[13px] text-[var(--color-text-muted)]">Scanning...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No skills linked for this project{showDirTabs ? ` in ${selectedDir}` : ""}.
              </p>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                Use Edit to assign profiles, or manually link skills to {project.path}/{selectedDir}/skills/
              </p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No skills match "{search}"
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredLinks.map((link) => {
                const isActive = link.status === "Active" || link.status === "Direct";
                const isBroken = link.status === "Broken";

                return (
                  <div
                    key={link.name}
                    className={`flex items-center gap-3 rounded-lg border transition-colors duration-100 ${
                      isBroken
                        ? "border-[var(--color-danger)]/30"
                        : "border-[var(--color-border)]"
                    }`}
                    style={{ padding: "10px 14px" }}
                  >
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() => handleToggle(link)}
                      className="shrink-0 relative w-8 h-[18px] rounded-full transition-colors duration-200 cursor-default"
                      style={{
                        backgroundColor: isBroken
                          ? "var(--color-danger)"
                          : isActive
                            ? "var(--color-success)"
                            : "var(--color-border)",
                      }}
                      title={isBroken ? "Broken link — click to remove" : isActive ? "Disable" : "Enable"}
                    >
                      <span
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200"
                        style={{
                          left: isActive || isBroken ? 15 : 2,
                        }}
                      />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-[var(--color-text)] truncate block">
                        {link.name}
                      </span>
                      <p className={`text-[11px] truncate mt-0.5 ${
                        isBroken ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
                      }`}>
                        {isBroken ? `Broken: ${link.target}` : link.description}
                      </p>
                    </div>

                    {/* Source badge */}
                    <span
                      className="shrink-0 text-[11px] font-medium rounded-full"
                      style={{
                        padding: "2px 8px",
                        backgroundColor: link.sourceColor
                          ? `${link.sourceColor}20`
                          : link.source === "Manual"
                            ? "rgba(251, 191, 36, 0.15)"
                            : "rgba(94, 95, 99, 0.15)",
                        color: link.sourceColor
                          ?? (link.source === "Manual"
                            ? "#fbbf24"
                            : "var(--color-text-muted)"),
                      }}
                    >
                      {link.source}
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
