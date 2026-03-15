import { useState } from "react";
import { useAgentDirStore } from "../../store/useAgentDirStore";
import { useProjectStore } from "../../store/useProjectStore";
import { syncAgentDirLinks } from "../../utils/tauri";

export function AgentDirSettings() {
  const agentDirs = useAgentDirStore((s) => s.agentDirs);
  const toggleAgentDir = useAgentDirStore((s) => s.toggleAgentDir);

  const projects = useProjectStore((s) => s.projects);

  const [syncSource, setSyncSource] = useState<string>("");
  const [syncTargets, setSyncTargets] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<string, number> | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 初始化 syncSource 为第一个 enabled dir
  const enabledDirs = agentDirs.filter((d) => d.enabled);
  const effectiveSyncSource = syncSource || enabledDirs[0]?.dir || "";

  const toggleSyncTarget = (dir: string) => {
    setSyncTargets((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
    setSyncResults(null);
  };

  const handleSync = async () => {
    if (!effectiveSyncSource || syncTargets.length === 0) return;
    setSyncing(true);
    setSyncError(null);
    setSyncResults(null);
    try {
      const result = await syncAgentDirLinks(
        effectiveSyncSource,
        syncTargets,
        true, // 用户级
        []
      );
      const counts: Record<string, number> = {};
      for (const [dir, names] of Object.entries(result)) {
        counts[dir] = names.length;
      }
      setSyncResults(counts);

      // 同时同步到所有项目
      if (projects.length > 0) {
        await syncAgentDirLinks(
          effectiveSyncSource,
          syncTargets,
          false,
          projects.map((p) => p.path)
        );
      }
    } catch (err) {
      setSyncError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  const labelClass = "text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider";

  return (
    <div className="space-y-6">
      {/* Agent Directories */}
      <div>
        <label className={labelClass}>Agent Directories</label>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 mb-3">
          当启用一个目录时，所有 skill 操作（创建/删除/同步）都会同时对该目录生效。
        </p>
        <div className="space-y-1">
          {agentDirs.map((d) => (
            <div
              key={d.dir}
              className="flex items-center justify-between rounded-md px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-mono text-[var(--color-text)]">{d.dir}</span>
                <span className="text-[12px] text-[var(--color-text-muted)]">{d.label}</span>
              </div>
              <button
                type="button"
                onClick={() => toggleAgentDir(d.dir, !d.enabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                  transition-colors duration-200 ease-in-out focus:outline-none
                  ${d.enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
                role="switch"
                aria-checked={d.enabled}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${d.enabled ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Between Directories */}
      {enabledDirs.length > 1 && (
        <div>
          <label className={labelClass}>Sync Between Directories</label>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1 mb-3">
            将源目录的 skill links 复制到目标目录（用户级 + 所有已绑定项目）。
          </p>

          <div className="rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] p-3 space-y-3">
            {/* Source */}
            <div>
              <span className="text-[11px] text-[var(--color-text-muted)] mb-1.5 block">Source</span>
              <div className="flex gap-1">
                {enabledDirs.map((d) => (
                  <button
                    key={d.dir}
                    type="button"
                    onClick={() => { setSyncSource(d.dir); setSyncResults(null); }}
                    className={`px-2.5 py-1 rounded text-[12px] font-mono transition-colors duration-100
                      ${effectiveSyncSource === d.dir
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                      }`}
                  >
                    {d.dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div>
              <span className="text-[11px] text-[var(--color-text-muted)] mb-1.5 block">Target（可多选）</span>
              <div className="flex gap-1 flex-wrap">
                {enabledDirs
                  .filter((d) => d.dir !== effectiveSyncSource)
                  .map((d) => {
                    const selected = syncTargets.includes(d.dir);
                    return (
                      <button
                        key={d.dir}
                        type="button"
                        onClick={() => toggleSyncTarget(d.dir)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-mono
                          border transition-colors duration-100
                          ${selected
                            ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-dim)]"
                            : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                          }`}
                      >
                        {selected && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {d.dir}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Error */}
            {syncError && (
              <div className="text-[12px] text-[var(--color-danger)] px-1">{syncError}</div>
            )}

            {/* Results */}
            {syncResults && (
              <div className="text-[12px] text-[var(--color-success)] px-1">
                {Object.entries(syncResults).map(([dir, count]) => (
                  <div key={dir}>✓ 同步了 {count} 个 skills 到 {dir}</div>
                ))}
              </div>
            )}

            {/* Sync Button */}
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !effectiveSyncSource || syncTargets.length === 0}
              className="w-full rounded-md py-1.5 text-[13px] font-medium
                         bg-[var(--color-accent)] text-white
                         hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-opacity duration-150"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
