import { useSkillStore, type GroupBy } from "../../store/useSkillStore";
import type { LinkStatus } from "../../types/skill";

const groupByOptions: { value: GroupBy; label: string }[] = [
  { value: "repo", label: "Repository" },
  { value: "category", label: "Category" },
  { value: "alpha", label: "Alphabetical" },
  { value: "status", label: "Status" },
];

const statusFilters: { value: LinkStatus | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Broken", label: "Broken" },
];

export function SkillFilter() {
  const searchQuery = useSkillStore((s) => s.searchQuery);
  const setSearchQuery = useSkillStore((s) => s.setSearchQuery);
  const groupBy = useSkillStore((s) => s.groupBy);
  const setGroupBy = useSkillStore((s) => s.setGroupBy);
  const filterStatus = useSkillStore((s) => s.filterStatus);
  const setFilterStatus = useSkillStore((s) => s.setFilterStatus);
  const filteredSkills = useSkillStore((s) => s.filteredSkills);

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-border)]" style={{ padding: "10px 20px" }}>
      {/* Search row */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills..."
          className="w-full h-9 pl-9 pr-3 rounded-md text-[13px]
                     bg-[var(--color-surface)] border border-[var(--color-border)]
                     text-[var(--color-text)] placeholder-[var(--color-text-muted)]
                     outline-none focus:border-[var(--color-accent)]
                     transition-colors duration-150"
        />
      </div>

      {/* Filter controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Group-by dropdown */}
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="h-8 px-2.5 rounded-md text-[12px] font-medium
                     bg-[var(--color-surface)] border border-[var(--color-border)]
                     text-[var(--color-text-secondary)]
                     outline-none focus:border-[var(--color-accent)]
                     cursor-default transition-colors duration-150"
        >
          {groupByOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Group: {opt.label}
            </option>
          ))}
        </select>

        {/* Status filter chips */}
        <div className="flex items-center gap-1">
          {statusFilters.map((sf) => {
            const isActive = filterStatus === sf.value;
            return (
              <button
                key={sf.label}
                type="button"
                onClick={() => setFilterStatus(sf.value)}
                className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors duration-100 cursor-default
                  ${
                    isActive
                      ? "bg-[var(--color-surface-active)] text-[var(--color-text)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  }`}
              >
                {sf.label}
              </button>
            );
          })}
        </div>

        {/* Result count, pushed right */}
        <span className="ml-auto text-[12px] text-[var(--color-text-muted)] tabular-nums">
          {filteredSkills.length} skill{filteredSkills.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
