interface GroupHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function GroupHeader({
  title,
  count,
  isExpanded,
  onToggle,
}: GroupHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 h-[36px] px-1 cursor-default
                 group select-none"
    >
      {/* Chevron */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className={`h-3 w-3 shrink-0 text-[var(--color-text-muted)] transition-transform duration-150 ${
          isExpanded ? "rotate-90" : "rotate-0"
        }`}
      >
        <path
          fillRule="evenodd"
          d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
          clipRule="evenodd"
        />
      </svg>

      {/* Title */}
      <span className="text-[13px] font-medium text-[var(--color-text)]">
        {title}
      </span>

      {/* Count */}
      <span className="text-[12px] text-[var(--color-text-muted)] tabular-nums">
        {count}
      </span>

      {/* Flex spacer */}
      <div className="flex-1" />
    </button>
  );
}
