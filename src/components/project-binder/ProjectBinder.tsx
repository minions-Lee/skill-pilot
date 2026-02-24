import { useEffect, useCallback, useState, useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "../../store/useProjectStore";
import { useProfileStore } from "../../store/useProfileStore";
import type { ProjectConfig } from "../../types/project";
import { ProjectCard } from "./ProjectCard";

export function ProjectBinder() {
  const projects = useProjectStore((s) => s.projects);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const saveProject = useProjectStore((s) => s.saveProject);
  const selectProject = useProjectStore((s) => s.selectProject);

  const profiles = useProfileStore((s) => s.profiles);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);

  const [search, setSearch] = useState("");
  const [filterProfileId, setFilterProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadProfiles();
  }, [loadProjects, loadProfiles]);

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.path.toLowerCase().includes(q)
      );
    }
    if (filterProfileId) {
      result = result.filter((p) =>
        p.profile_ids.includes(filterProfileId)
      );
    }
    return result;
  }, [projects, search, filterProfileId]);

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

  const handleCardClick = useCallback(
    (project: ProjectConfig) => {
      selectProject(project.id);
    },
    [selectProject]
  );

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

        {/* Search & Filter */}
        {projects.length > 0 && (
          <div className="mb-3 space-y-2">
            {/* Search input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
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
                  placeholder="Search projects..."
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
                             pl-8 pr-3 py-1.5 text-[13px] text-[var(--color-text)]
                             placeholder:text-[var(--color-text-muted)]
                             focus:outline-none focus:border-[var(--color-accent)]
                             transition-colors duration-150"
                />
              </div>
              <span className="text-[12px] text-[var(--color-text-muted)] shrink-0">
                {filteredProjects.length}/{projects.length}
              </span>
            </div>

            {/* Profile filter chips */}
            <div className="flex flex-wrap gap-1.5">
              {profiles.map((profile) => {
                const isActive = filterProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() =>
                      setFilterProfileId(isActive ? null : profile.id)
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium
                               border transition-colors duration-150 ${
                                 isActive
                                   ? "border-transparent"
                                   : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                               }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: profile.color + "33",
                            color: profile.color,
                          }
                        : { color: "var(--color-text-secondary)" }
                    }
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isActive
                          ? profile.color
                          : "var(--color-text-muted)",
                      }}
                    />
                    {profile.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] text-[var(--color-text-muted)]">
              No projects match the current filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjects.map((project) => (
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
    </div>
  );
}
