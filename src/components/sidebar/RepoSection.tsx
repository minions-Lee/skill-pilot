import { useMemo } from "react";
import { useSkillStore } from "../../store/useSkillStore";

interface RepoSectionProps {
  onNavigate?: () => void;
}

export default function RepoSection({ onNavigate }: RepoSectionProps) {
  const skills = useSkillStore((s) => s.skills);
  const filterRepo = useSkillStore((s) => s.filterRepo);
  const setFilterRepo = useSkillStore((s) => s.setFilterRepo);

  const repos = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of skills) {
      const repo = skill.source_repo;
      counts.set(repo, (counts.get(repo) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b));
  }, [skills]);

  function handleClick(repo: string) {
    setFilterRepo(filterRepo === repo ? null : repo);
    onNavigate?.();
  }

  if (repos.length === 0) {
    return (
      <p data-sb="item" style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
        No repos scanned yet
      </p>
    );
  }

  return (
    <div data-sb="item-list">
      {repos.map(([repo, count]) => {
        const isActive = filterRepo === repo;
        const label = repo.split("/").pop() ?? repo;

        return (
          <button
            key={repo}
            type="button"
            onClick={() => handleClick(repo)}
            title={repo}
            data-sb="item"
            data-active={isActive ? "true" : undefined}
          >
            {/* Book icon */}
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
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span data-sb="item-label">{label}</span>
            <span data-sb="badge">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
