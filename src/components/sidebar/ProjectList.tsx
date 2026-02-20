import { useEffect } from "react";
import { useProjectStore } from "../../store/useProjectStore";

export default function ProjectList() {
  const projects = useProjectStore((s) => s.projects);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const selectProject = useProjectStore((s) => s.selectProject);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const loading = useProjectStore((s) => s.loading);

  useEffect(() => {
    if (projects.length === 0 && !loading) {
      loadProjects();
    }
  }, [projects.length, loading, loadProjects]);

  function handleClick(id: string) {
    selectProject(selectedProjectId === id ? null : id);
  }

  function truncatePath(path: string, maxLen = 28): string {
    if (path.length <= maxLen) return path;
    const parts = path.split("/");
    if (parts.length <= 3) return "..." + path.slice(-(maxLen - 3));
    const last = parts.slice(-2).join("/");
    return "~/" + last;
  }

  return (
    <div data-sb="item-list">
      {projects.length === 0 && !loading && (
        <p data-sb="item" style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          No projects added
        </p>
      )}

      {loading && projects.length === 0 && (
        <p data-sb="item" style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          Loading...
        </p>
      )}

      {projects.map((project) => {
        const isSelected = selectedProjectId === project.id;
        const profileCount = project.profile_ids.length;

        return (
          <button
            key={project.id}
            type="button"
            onClick={() => handleClick(project.id)}
            data-sb="item"
            data-active={isSelected ? "true" : undefined}
          >
            {/* Folder icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                {project.name}
              </span>
              <span
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 11,
                  color: isSelected ? "var(--color-accent)" : "var(--color-text-muted)",
                  opacity: isSelected ? 0.6 : 1,
                }}
                title={project.path}
              >
                {truncatePath(project.path)}
              </span>
            </div>
            <span data-sb="count">
              {profileCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
