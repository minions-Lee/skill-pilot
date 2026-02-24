import type { ProjectConfig } from "../../types/project";
import type { Profile } from "../../types/profile";

interface ProjectCardProps {
  project: ProjectConfig;
  profiles: Profile[];
  onClick: () => void;
}

export function ProjectCard({ project, profiles, onClick }: ProjectCardProps) {
  const assignedProfiles = profiles.filter((p) =>
    project.profile_ids.includes(p.id)
  );
  // Debug: verify data reaching ProjectCard
  if (project.profile_ids.length > 0 && assignedProfiles.length === 0) {
    console.warn(
      `[ProjectCard] "${project.name}" has profile_ids=${JSON.stringify(project.profile_ids)} but matched 0 profiles. Available profile IDs:`,
      profiles.map((p) => p.id)
    );
  }
  const extraCount = project.extra_skill_ids.length;

  /** Truncate path, keeping the last 2-3 segments visible. */
  function truncatePath(path: string, maxLen = 40): string {
    if (path.length <= maxLen) return path;
    const parts = path.split("/");
    if (parts.length <= 3) return path;
    return ".../" + parts.slice(-3).join("/");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]
                 p-3 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]
                 transition-colors duration-100 group"
    >
      {/* Name */}
      <h3 className="text-[13px] font-medium text-[var(--color-text)] mb-0.5 truncate group-hover:text-[var(--color-accent)] transition-colors">
        {project.name}
      </h3>

      {/* Path */}
      <p className="text-[11px] text-[var(--color-text-muted)] font-mono truncate mb-2.5">
        {truncatePath(project.path)}
      </p>

      {/* Profile badges */}
      {assignedProfiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {assignedProfiles.map((profile) => (
            <span
              key={profile.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: profile.color + "22",
                color: profile.color,
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: profile.color }}
              />
              {profile.name}
            </span>
          ))}
        </div>
      )}

      {/* Extra skills count */}
      {extraCount > 0 && (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          +{extraCount} extra skill{extraCount !== 1 ? "s" : ""}
        </p>
      )}
    </button>
  );
}
