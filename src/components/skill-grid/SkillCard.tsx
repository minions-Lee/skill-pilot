import type { Skill, LinkStatus } from "../../types/skill";

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  onClick: () => void;
  onToggleLink: () => void;
}

const statusDotColor: Record<LinkStatus, string> = {
  Active: "var(--color-success)",
  Broken: "var(--color-danger)",
  Inactive: "var(--color-text-muted)",
  Direct: "var(--color-info)",
};

const statusLabel: Record<LinkStatus, string> = {
  Active: "Active",
  Broken: "Broken",
  Inactive: "Inactive",
  Direct: "Direct",
};

/** Derive a deterministic accent color for a repo name (Linear-style muted tones). */
function repoColor(repo: string): string {
  const palette = [
    "#5e6ad2", // indigo
    "#4cb782", // green
    "#f2994a", // amber
    "#eb5757", // red
    "#a77bca", // purple
    "#4da7c9", // cyan
    "#d4a259", // gold
    "#7c8ea6", // slate
  ];
  let hash = 0;
  for (let i = 0; i < repo.length; i++) {
    hash = repo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export function SkillCard({
  skill,
  isSelected,
  onClick,
  onToggleLink,
}: SkillCardProps) {
  const isLinked =
    skill.link_status_user === "Active" ||
    skill.link_status_user === "Direct";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex flex-col gap-2.5 p-3 rounded-lg cursor-default
                  bg-[var(--color-surface)] border transition-all duration-100
                  hover:bg-[var(--color-surface-hover)]
                  ${
                    isSelected
                      ? "border-[var(--color-accent)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                  }`}
    >
      {/* Top row: name + toggle */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Status dot */}
            <span
              className="shrink-0 w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: statusDotColor[skill.link_status_user] }}
              title={statusLabel[skill.link_status_user]}
            />
            <h3 className="text-[13px] font-medium text-[var(--color-text)] truncate leading-tight">
              {skill.name}
            </h3>
          </div>

          {/* Repo badge */}
          <span
            className="inline-block mt-1.5 px-1.5 py-px rounded text-[11px] font-medium leading-tight"
            style={{
              color: repoColor(skill.source_repo),
              backgroundColor: `${repoColor(skill.source_repo)}15`,
            }}
          >
            {skill.source_repo}
          </span>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLink();
          }}
          title={isLinked ? "Unlink skill" : "Link skill"}
          className="shrink-0 relative w-8 h-[18px] rounded-full transition-colors duration-200 cursor-default"
          style={{
            backgroundColor: isLinked
              ? "var(--color-success)"
              : "var(--color-border)",
          }}
        >
          <span
            className="absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200"
            style={{
              left: isLinked ? "calc(100% - 16px)" : "2px",
            }}
          />
        </button>
      </div>

      {/* Description (2-line clamp) */}
      {skill.description && (
        <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)] line-clamp-2">
          {skill.description}
        </p>
      )}
    </div>
  );
}
