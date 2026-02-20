import { useEffect, useState, useCallback, useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "../../store/useProjectStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useSkillStore } from "../../store/useSkillStore";
import type { ProjectConfig } from "../../types/project";
import { ProjectCard } from "./ProjectCard";

export function ProjectBinder() {
  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const saveProject = useProjectStore((s) => s.saveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  const profiles = useProfileStore((s) => s.profiles);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);

  const skills = useSkillStore((s) => s.skills);

  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null);
  const [editName, setEditName] = useState("");
  const [editProfileIds, setEditProfileIds] = useState<string[]>([]);
  const [editExtraSkillIds, setEditExtraSkillIds] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  useEffect(() => {
    loadProjects();
    loadProfiles();
  }, [loadProjects, loadProfiles]);

  const handleAddProject = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;

    const dirPath = typeof selected === "string" ? selected : selected;
    const name = (dirPath as string).split("/").pop() ?? "Project";

    const newProject: ProjectConfig = {
      id: crypto.randomUUID(),
      name,
      path: dirPath as string,
      profile_ids: [],
      extra_skill_ids: [],
    };
    await saveProject(newProject);
  }, [saveProject]);

  const handleCardClick = useCallback((project: ProjectConfig) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditProfileIds([...project.profile_ids]);
    setEditExtraSkillIds([...project.extra_skill_ids]);
    setSkillSearch("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingProject) return;
    await saveProject({
      ...editingProject,
      name: editName.trim() || editingProject.name,
      profile_ids: editProfileIds,
      extra_skill_ids: editExtraSkillIds,
    });
    setEditingProject(null);
  }, [editingProject, editName, editProfileIds, editExtraSkillIds, saveProject]);

  const handleDeleteProject = useCallback(async () => {
    if (!editingProject) return;
    await deleteProject(editingProject.id);
    setEditingProject(null);
  }, [editingProject, deleteProject]);

  const handleToggleProfile = useCallback((profileId: string) => {
    setEditProfileIds((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  }, []);

  const handleAddExtraSkill = useCallback((skillId: string) => {
    setEditExtraSkillIds((prev) => [...prev, skillId]);
    setSkillSearch("");
  }, []);

  const handleRemoveExtraSkill = useCallback((skillId: string, skillName: string) => {
    setEditExtraSkillIds((prev) => prev.filter((id) => id !== skillId && id !== skillName));
  }, []);

  const filteredSkillsForAdd = useMemo(() => {
    if (!skillSearch.trim()) return [];
    const q = skillSearch.toLowerCase();
    return skills
      .filter(
        (s) =>
          !editExtraSkillIds.includes(s.id) &&
          !editExtraSkillIds.includes(s.name) &&
          (s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.tags.some((t) => t.toLowerCase().includes(q)))
      )
      .slice(0, 10);
  }, [skills, editExtraSkillIds, skillSearch]);

  const extraSkillEntries = useMemo(
    () =>
      editExtraSkillIds.map((sid) => {
        const found = skills.find((s) => s.id === sid || s.name === sid);
        return { sid, skill: found ?? null };
      }),
    [skills, editExtraSkillIds]
  );

  // Resolved skills from assigned profiles (for display)
  const profileSkillObjects = useMemo(() => {
    const assignedProfiles = profiles.filter((p) => editProfileIds.includes(p.id));
    return assignedProfiles.flatMap((profile) =>
      profile.skill_ids
        .map((sid) => {
          const skill = skills.find((s) => s.id === sid || s.name === sid);
          return skill ? { skill, profileName: profile.name, profileColor: profile.color } : null;
        })
        .filter(Boolean)
    );
  }, [profiles, editProfileIds, skills]);

  return (
    <div className="h-full overflow-y-auto">
      <div style={{ padding: 20 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[14px] font-semibold text-[var(--color-text)]">
              Project Binder
            </h1>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
              Manage projects and their skill assignments
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddProject}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium
                       bg-[var(--color-accent)] text-[var(--color-bg)]
                       hover:opacity-90 transition-opacity duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Project
          </button>
        </div>

        {/* Project Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-[var(--color-text-muted)]">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              No projects yet. Click "Add Project" to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                profiles={profiles}
                onClick={() => handleCardClick(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[520px] max-h-[85vh] flex flex-col rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                Edit Project
              </h2>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
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

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                             px-3 py-1.5 text-[13px] text-[var(--color-text)]
                             focus:outline-none focus:border-[var(--color-accent)]
                             transition-colors duration-150"
                />
              </div>

              {/* Path (read-only) */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                  Path
                </label>
                <p className="text-[13px] text-[var(--color-text-secondary)] font-mono bg-[var(--color-surface)] rounded-md px-3 py-1.5 border border-[var(--color-border)]">
                  {editingProject.path}
                </p>
              </div>

              {/* Profiles */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                  Profiles
                </label>
                {profiles.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] italic">
                    No profiles available.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((profile) => {
                      const isAssigned = editProfileIds.includes(profile.id);
                      return (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => handleToggleProfile(profile.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
                                     border transition-colors duration-150 ${
                                       isAssigned
                                         ? "border-transparent"
                                         : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                                     }`}
                          style={
                            isAssigned
                              ? { backgroundColor: profile.color + "33", color: profile.color }
                              : { color: "var(--color-text-secondary)" }
                          }
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: isAssigned
                                ? profile.color
                                : "var(--color-text-muted)",
                            }}
                          />
                          {profile.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Extra skills */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                  Extra Skills ({editExtraSkillIds.length})
                </label>

                {extraSkillEntries.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {extraSkillEntries.map(({ sid, skill }) => (
                      <div
                        key={sid}
                        className={`flex items-center justify-between gap-2 rounded-md bg-[var(--color-surface)]
                                   border border-[var(--color-border)] px-2.5 py-1.5 ${!skill ? "opacity-60" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] text-[var(--color-text)] truncate">{skill?.name ?? sid}</p>
                          {!skill && (
                            <p className="text-[11px] text-[var(--color-danger)] truncate">未在仓库中找到</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraSkill(skill?.id ?? sid, skill?.name ?? sid)}
                          className="shrink-0 flex items-center justify-center w-5 h-5 rounded text-[var(--color-text-muted)]
                                     hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-hover)]
                                     transition-colors duration-150"
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

                <div>
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills to add..."
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                               px-3 py-1.5 text-[13px] text-[var(--color-text)]
                               placeholder:text-[var(--color-text-muted)]
                               focus:outline-none focus:border-[var(--color-accent)]
                               transition-colors duration-150"
                  />
                  {skillSearch.trim() && filteredSkillsForAdd.length === 0 && (
                    <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)] px-1">
                      No matching skills found ({skills.length} total)
                    </p>
                  )}
                  {filteredSkillsForAdd.length > 0 && (
                    <div className="mt-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)]
                                    max-h-48 overflow-y-auto">
                      {filteredSkillsForAdd.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleAddExtraSkill(s.id)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left
                                     hover:bg-[var(--color-surface-hover)] transition-colors duration-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-accent)]">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-[13px] text-[var(--color-text)] truncate">{s.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{s.source_repo}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Skills from profiles (read-only view) */}
              {profileSkillObjects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                    Skills from Profiles ({profileSkillObjects.length})
                  </label>
                  <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5">
                    {profileSkillObjects.map((item, i) => (
                      <div
                        key={`${item!.skill.id}-${i}`}
                        className="flex items-center gap-2 px-2 py-1 rounded"
                      >
                        <span
                          className="shrink-0 w-2 h-2 rounded-full"
                          style={{ backgroundColor: item!.profileColor }}
                          title={item!.profileName}
                        />
                        <span className="text-[13px] text-[var(--color-text)] truncate flex-1">
                          {item!.skill.name}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">
                          {item!.profileName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={handleDeleteProject}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--color-danger)]
                           hover:bg-[var(--color-danger)]/10 transition-colors duration-150"
              >
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-sm
                             text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]
                             transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-md px-4 py-1.5 text-[13px] font-medium
                             bg-[var(--color-accent)] text-[var(--color-bg)]
                             hover:opacity-90 transition-opacity duration-150"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
