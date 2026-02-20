import type { LinkStatus as LinkStatusType } from "../../types/skill";

interface LinkStatusProps {
  status: LinkStatusType;
  onToggle: () => void;
  skillName: string;
}

const statusConfig: Record<
  LinkStatusType,
  { color: string; dotClass: string; label: string }
> = {
  Active: {
    color: "var(--color-success)",
    dotClass: "bg-[var(--color-success)]",
    label: "Active",
  },
  Broken: {
    color: "var(--color-danger)",
    dotClass: "bg-[var(--color-danger)]",
    label: "Broken",
  },
  Inactive: {
    color: "var(--color-text-muted)",
    dotClass: "bg-[var(--color-text-muted)]",
    label: "Inactive",
  },
  Direct: {
    color: "var(--color-info)",
    dotClass: "bg-[var(--color-info)]",
    label: "Direct",
  },
};

export function LinkStatus({ status, onToggle, skillName }: LinkStatusProps) {
  const config = statusConfig[status];
  const isActive = status === "Active" || status === "Direct";
  const canToggle = status !== "Broken";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${config.dotClass}`}
          aria-hidden="true"
        />
        <span
          className="text-[13px] font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </div>

      {canToggle ? (
        <button
          type="button"
          onClick={onToggle}
          title={
            isActive
              ? `Disable ${skillName} at user level`
              : `Enable ${skillName} at user level`
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full
                     transition-colors duration-200 focus:outline-none
                     ${isActive ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
                       transform transition-transform duration-200
                       ${isActive ? "translate-x-4.5" : "translate-x-0.5"}`}
          />
        </button>
      ) : (
        <span className="text-xs text-[var(--color-danger)] italic">
          Link broken
        </span>
      )}
    </div>
  );
}
