import { useState } from "react";
import { useRemoteStore } from "../../store/useRemoteStore";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { RemoteServerForm } from "./RemoteServerForm";
import type { RemoteServer } from "../../types/remote";

export function RemoteServerList() {
  const servers = useRemoteStore((s) => s.servers);
  const connectionStatuses = useRemoteStore((s) => s.connectionStatuses);
  const deleteServer = useRemoteStore((s) => s.deleteServer);
  const testConnection = useRemoteStore((s) => s.testConnection);
  const disconnect = useRemoteStore((s) => s.disconnect);
  const activeServerId = useRemoteStore((s) => s.activeServerId);

  const [editingServer, setEditingServer] = useState<RemoteServer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingServer(null);
    setShowForm(true);
  };

  const handleEdit = (server: RemoteServer) => {
    setEditingServer(server);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    try {
      await deleteServer(id);
    } catch (err) {
      console.error("Delete server failed:", err);
    }
    setConfirmDelete(null);
  };

  const handleTest = async (server: RemoteServer) => {
    await testConnection(server);
  };

  const handleDisconnect = async (serverId: string) => {
    await disconnect(serverId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--color-text)]">
            Remote Servers
          </h3>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
            Configure SSH servers for remote skill management.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Server
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-2"
            style={{ opacity: 0.5 }}
          >
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            No remote servers configured.
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Add a server to manage skills on remote machines via SSH.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => {
            const status = connectionStatuses[server.id];
            const isActive = activeServerId === server.id;
            const isConnected = status?.status === "Connected";

            return (
              <div
                key={server.id}
                className="rounded-lg border border-[var(--color-border)] overflow-hidden"
                style={{
                  background: isActive
                    ? "var(--color-accent-dim)"
                    : "var(--color-surface)",
                }}
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Status + Name */}
                  <ConnectionStatusBadge status={status} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--color-text)] truncate">
                        {server.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-bg)] font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 font-mono truncate">
                      {server.username}@{server.host}
                      {server.port !== 22 ? `:${server.port}` : ""}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isConnected ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(server.id)}
                        className="rounded-md px-2 py-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        title="Disconnect"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTest(server)}
                        className="rounded-md px-2 py-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-success)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        title="Test Connection"
                      >
                        Connect
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(server)}
                      className="flex items-center justify-center w-6 h-6 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                      title="Edit"
                    >
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
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(server.id)}
                      className="flex items-center justify-center w-6 h-6 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-hover)] transition-colors"
                      title={
                        confirmDelete === server.id
                          ? "Click again to confirm"
                          : "Delete"
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={
                          confirmDelete === server.id
                            ? "var(--color-danger)"
                            : "currentColor"
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {status?.status === "Error" && (
                  <div className="px-3 pb-2">
                    <div className="text-[11px] text-[var(--color-danger)] truncate">
                      {status.message}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inline server form modal */}
      {showForm && (
        <RemoteServerForm
          server={editingServer}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
