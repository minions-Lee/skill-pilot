import { useState, useCallback } from "react";
import { useRemoteStore } from "../../store/useRemoteStore";
import { saveSshCredential } from "../../utils/tauri-remote";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import type { RemoteServer, SshAuth, ConnectionStatus } from "../../types/remote";

interface RemoteServerFormProps {
  server?: RemoteServer | null;
  onClose: () => void;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RemoteServerForm({ server, onClose }: RemoteServerFormProps) {
  const saveServer = useRemoteStore((s) => s.saveServer);
  const testConnection = useRemoteStore((s) => s.testConnection);

  const [name, setName] = useState(server?.name ?? "");
  const [host, setHost] = useState(server?.host ?? "");
  const [port, setPort] = useState(server?.port ?? 22);
  const [username, setUsername] = useState(server?.username ?? "");
  const [authType, setAuthType] = useState<SshAuth["type"]>(
    server?.auth?.type ?? "Key"
  );
  const [privateKeyPath, setPrivateKeyPath] = useState(
    server?.auth?.type === "Key" ? server.auth.private_key_path : "~/.ssh/id_rsa"
  );
  const [password, setPassword] = useState("");
  const [remoteRepoPath, setRemoteRepoPath] = useState(
    server?.remote_repo_path ?? ""
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [remoteConfigDir, setRemoteConfigDir] = useState(
    server?.remote_config_dir ?? ""
  );
  const [remoteSkillsDir, setRemoteSkillsDir] = useState(
    server?.remote_skills_dir ?? ""
  );
  const [connectTimeout, setConnectTimeout] = useState(
    server?.connect_timeout_secs ?? 10
  );
  const [commandTimeout, setCommandTimeout] = useState(
    server?.command_timeout_secs ?? 30
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionStatus | null>(null);

  const buildAuth = useCallback((): SshAuth => {
    switch (authType) {
      case "Key":
        return { type: "Key", private_key_path: privateKeyPath };
      case "Agent":
        return { type: "Agent" };
      case "Password":
        return { type: "Password" };
    }
  }, [authType, privateKeyPath]);

  const buildServer = useCallback((): RemoteServer => {
    return {
      id: server?.id ?? generateId(),
      name: name.trim(),
      host: host.trim(),
      port,
      username: username.trim(),
      auth: buildAuth(),
      remote_repo_path: remoteRepoPath.trim(),
      remote_config_dir: remoteConfigDir.trim() || null,
      remote_skills_dir: remoteSkillsDir.trim() || null,
      connect_timeout_secs: connectTimeout || null,
      command_timeout_secs: commandTimeout || null,
    };
  }, [
    server,
    name,
    host,
    port,
    username,
    buildAuth,
    remoteRepoPath,
    remoteConfigDir,
    remoteSkillsDir,
    connectTimeout,
    commandTimeout,
  ]);

  const isValid =
    name.trim() && host.trim() && username.trim() && remoteRepoPath.trim();

  const handleTest = useCallback(async () => {
    if (!isValid) return;
    setTesting(true);
    setTestResult(null);
    try {
      const s = buildServer();
      // Save password to Keychain if auth is Password
      if (authType === "Password" && password) {
        await saveSshCredential(s.id, password);
      }
      const status = await testConnection(s);
      setTestResult(status);
    } catch (err) {
      setTestResult({ status: "Error", message: String(err) });
    }
    setTesting(false);
  }, [isValid, buildServer, authType, password, testConnection]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const s = buildServer();
      // Save password to Keychain if auth is Password
      if (authType === "Password" && password) {
        await saveSshCredential(s.id, password);
      }
      await saveServer(s);
      onClose();
    } catch (err) {
      console.error("Save server failed:", err);
    }
    setSaving(false);
  }, [isValid, buildServer, authType, password, saveServer, onClose]);

  const inputClass =
    "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors duration-150";

  const labelClass =
    "block text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-h-[85vh] rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            {server ? "Edit Server" : "Add Server"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1">
          {/* Name */}
          <div>
            <label className={labelClass}>Server Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dev Server"
              className={inputClass}
            />
          </div>

          {/* Host + Port */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.100 or hostname"
                className={inputClass}
              />
            </div>
            <div style={{ width: 80 }}>
              <label className={labelClass}>Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || 22)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root"
              className={inputClass}
            />
          </div>

          {/* Auth method */}
          <div>
            <label className={labelClass}>Authentication</label>
            <div className="flex gap-1">
              {(["Key", "Agent", "Password"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAuthType(t)}
                  className="rounded-md px-3 py-1 text-[12px] font-medium transition-colors duration-100"
                  style={{
                    background:
                      authType === t
                        ? "var(--color-accent)"
                        : "var(--color-surface)",
                    color:
                      authType === t
                        ? "var(--color-bg)"
                        : "var(--color-text-secondary)",
                    border: `1px solid ${authType === t ? "var(--color-accent)" : "var(--color-border)"}`,
                  }}
                >
                  {t === "Key" ? "SSH Key" : t === "Agent" ? "SSH Agent" : "Password"}
                </button>
              ))}
            </div>
          </div>

          {/* Auth-specific fields */}
          {authType === "Key" && (
            <div>
              <label className={labelClass}>Private Key Path</label>
              <input
                type="text"
                value={privateKeyPath}
                onChange={(e) => setPrivateKeyPath(e.target.value)}
                placeholder="~/.ssh/id_rsa"
                className={`${inputClass} font-mono`}
              />
            </div>
          )}
          {authType === "Password" && (
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Stored in macOS Keychain"
                className={inputClass}
              />
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                Password is securely stored in macOS Keychain, not in config files.
              </p>
            </div>
          )}

          {/* Remote repo path */}
          <div>
            <label className={labelClass}>Remote Skill Repo Path</label>
            <input
              type="text"
              value={remoteRepoPath}
              onChange={(e) => setRemoteRepoPath(e.target.value)}
              placeholder="/home/user/skills"
              className={`${inputClass} font-mono`}
            />
          </div>

          {/* Advanced settings (collapsible) */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: showAdvanced ? "rotate(90deg)" : undefined,
                transition: "transform 150ms",
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-3 pl-3 border-l-2 border-[var(--color-border-subtle)]">
              <div>
                <label className={labelClass}>
                  Remote Config Dir (default: ~/.claude-skill-manager)
                </label>
                <input
                  type="text"
                  value={remoteConfigDir}
                  onChange={(e) => setRemoteConfigDir(e.target.value)}
                  placeholder="~/.claude-skill-manager"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Remote Skills Dir (default: ~/.claude/skills)
                </label>
                <input
                  type="text"
                  value={remoteSkillsDir}
                  onChange={(e) => setRemoteSkillsDir(e.target.value)}
                  placeholder="~/.claude/skills"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className={labelClass}>Connect Timeout (s)</label>
                  <input
                    type="number"
                    value={connectTimeout}
                    onChange={(e) =>
                      setConnectTimeout(Number(e.target.value) || 10)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Command Timeout (s)</label>
                  <input
                    type="number"
                    value={commandTimeout}
                    onChange={(e) =>
                      setCommandTimeout(Number(e.target.value) || 30)
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <div
              className="flex items-center gap-2 rounded-md px-3 py-2 text-[12px]"
              style={{
                background:
                  testResult.status === "Connected"
                    ? "rgba(76, 183, 130, 0.1)"
                    : "rgba(235, 87, 87, 0.1)",
                color:
                  testResult.status === "Connected"
                    ? "var(--color-success)"
                    : "var(--color-danger)",
              }}
            >
              <ConnectionStatusBadge status={testResult} size="md" />
              {testResult.status === "Error" && (
                <span className="truncate" title={testResult.message}>
                  {testResult.message}
                </span>
              )}
              {testResult.status === "Connected" && (
                <span>Connection successful!</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[var(--color-border)] shrink-0">
          <button
            type="button"
            onClick={handleTest}
            disabled={!isValid || testing}
            className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || saving}
              className="rounded-md px-4 py-1.5 text-[13px] font-medium bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity duration-150"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
