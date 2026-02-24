import type { ConnectionStatus } from "../../types/remote";

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus | undefined;
  size?: "sm" | "md";
}

const STATUS_COLORS: Record<string, string> = {
  Connected: "var(--color-success)",
  Connecting: "var(--color-warning)",
  Disconnected: "var(--color-text-muted)",
  Error: "var(--color-danger)",
};

const STATUS_LABELS: Record<string, string> = {
  Connected: "Connected",
  Connecting: "Connecting...",
  Disconnected: "Disconnected",
  Error: "Error",
};

export function ConnectionStatusBadge({
  status,
  size = "sm",
}: ConnectionStatusBadgeProps) {
  const statusKey = status?.status ?? "Disconnected";
  const color = STATUS_COLORS[statusKey] ?? STATUS_COLORS.Disconnected;
  const label = STATUS_LABELS[statusKey] ?? "Unknown";
  const dotSize = size === "sm" ? 6 : 8;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={status?.status === "Error" ? status.message : label}
    >
      <span
        style={{
          display: "inline-block",
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {size === "md" && (
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {label}
        </span>
      )}
    </span>
  );
}
