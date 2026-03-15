import { create } from "zustand";
import type { AgentDir } from "../types/agent-dir";
import { listAgentDirs, saveAgentDirs } from "../utils/tauri";

interface AgentDirState {
  agentDirs: AgentDir[];
  loading: boolean;

  loadAgentDirs: () => Promise<void>;
  saveAgentDirs: (dirs: AgentDir[]) => Promise<void>;
  toggleAgentDir: (dir: string, enabled: boolean) => Promise<void>;
  getActiveAgentDirs: () => AgentDir[];
}

export const useAgentDirStore = create<AgentDirState>((set, get) => ({
  agentDirs: [],
  loading: false,

  loadAgentDirs: async () => {
    set({ loading: true });
    try {
      const dirs = await listAgentDirs();
      set({ agentDirs: dirs });
    } catch (err) {
      console.error("Failed to load agent dirs:", err);
    } finally {
      set({ loading: false });
    }
  },

  saveAgentDirs: async (dirs: AgentDir[]) => {
    try {
      const updated = await saveAgentDirs(dirs);
      set({ agentDirs: updated });
    } catch (err) {
      console.error("Failed to save agent dirs:", err);
      throw err;
    }
  },

  toggleAgentDir: async (dir: string, enabled: boolean) => {
    const current = get().agentDirs;
    const updated = current.map((d) => (d.dir === dir ? { ...d, enabled } : d));
    await get().saveAgentDirs(updated);
  },

  getActiveAgentDirs: () => get().agentDirs.filter((d) => d.enabled),
}));
