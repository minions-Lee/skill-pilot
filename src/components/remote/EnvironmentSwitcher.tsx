import { useState, useRef, useEffect } from "react";
import { useRemoteStore } from "../../store/useRemoteStore";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";

interface EnvironmentSwitcherProps {
  onManageServers: () => void;
}

export function EnvironmentSwitcher({
  onManageServers,
}: EnvironmentSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const servers = useRemoteStore((s) => s.servers);
  const activeServerId = useRemoteStore((s) => s.activeServerId);
  const connectionStatuses = useRemoteStore((s) => s.connectionStatuses);
  const setActiveServer = useRemoteStore((s) => s.setActiveServer);

  const activeServer = servers.find((s) => s.id === activeServerId);
  const label = activeServer ? activeServer.name : "Local";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (serverId: string | null) => {
    setOpen(false);
    await setActiveServer(serverId);
  };

  return (
    <div ref={ref} style={{ position: "relative", padding: "8px 10px 4px" }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--color-border-subtle)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "default",
          transition: "all 100ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.background = "var(--color-surface-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border-subtle)";
          e.currentTarget.style.background = "var(--color-surface)";
        }}
      >
        {/* Environment icon */}
        {activeServer ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, opacity: 0.7 }}
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )}

        <span
          style={{
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>

        {activeServer && (
          <ConnectionStatusBadge
            status={connectionStatuses[activeServer.id]}
          />
        )}

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            opacity: 0.4,
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 150ms",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 10,
            right: 10,
            zIndex: 100,
            marginTop: 4,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-raised)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            overflow: "hidden",
          }}
        >
          {/* Local option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background:
                activeServerId === null
                  ? "var(--color-accent-dim)"
                  : "transparent",
              color:
                activeServerId === null
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
              fontSize: 12,
              cursor: "default",
              textAlign: "left",
              transition: "all 100ms",
            }}
            onMouseEnter={(e) => {
              if (activeServerId !== null)
                e.currentTarget.style.background = "var(--color-surface-hover)";
            }}
            onMouseLeave={(e) => {
              if (activeServerId !== null)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, opacity: 0.6 }}
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span style={{ flex: 1 }}>Local</span>
            {activeServerId === null && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Servers */}
          {servers.map((server) => (
            <button
              key={server.id}
              type="button"
              onClick={() => handleSelect(server.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background:
                  activeServerId === server.id
                    ? "var(--color-accent-dim)"
                    : "transparent",
                color:
                  activeServerId === server.id
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                fontSize: 12,
                cursor: "default",
                textAlign: "left",
                transition: "all 100ms",
              }}
              onMouseEnter={(e) => {
                if (activeServerId !== server.id)
                  e.currentTarget.style.background =
                    "var(--color-surface-hover)";
              }}
              onMouseLeave={(e) => {
                if (activeServerId !== server.id)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <ConnectionStatusBadge
                status={connectionStatuses[server.id]}
              />
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {server.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                {server.host}
              </span>
              {activeServerId === server.id && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}

          {/* Divider + manage */}
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              margin: "0",
            }}
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManageServers();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: 12,
              cursor: "default",
              textAlign: "left",
              transition: "all 100ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-surface-hover)";
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Manage Servers...
          </button>
        </div>
      )}
    </div>
  );
}
