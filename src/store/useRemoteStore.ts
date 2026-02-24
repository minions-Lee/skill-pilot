import { create } from "zustand";
import type { RemoteServer, ConnectionStatus } from "../types/remote";
import {
  listRemoteServers,
  saveRemoteServer,
  deleteRemoteServer as apiDeleteRemoteServer,
  testRemoteConnection,
  disconnectRemote,
  getConnectionStatus,
  remoteInitConfig,
} from "../utils/tauri-remote";

interface RemoteState {
  /** All configured remote servers */
  servers: RemoteServer[];
  /** Currently active environment: null = local, string = remote server id */
  activeServerId: string | null;
  /** Connection status per server id */
  connectionStatuses: Record<string, ConnectionStatus>;
  loading: boolean;

  loadServers: () => Promise<void>;
  saveServer: (server: RemoteServer) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  testConnection: (server: RemoteServer) => Promise<ConnectionStatus>;
  disconnect: (serverId: string) => Promise<void>;
  refreshConnectionStatus: (serverId: string) => Promise<void>;
  setActiveServer: (serverId: string | null) => Promise<void>;
  isRemoteActive: () => boolean;
  getActiveServer: () => RemoteServer | null;
}

export const useRemoteStore = create<RemoteState>((set, get) => ({
  servers: [],
  activeServerId: null,
  connectionStatuses: {},
  loading: false,

  loadServers: async () => {
    set({ loading: true });
    try {
      const servers = await listRemoteServers();
      set({ servers, loading: false });
    } catch (err) {
      console.error("[RemoteStore] loadServers failed:", err);
      set({ loading: false });
    }
  },

  saveServer: async (server) => {
    await saveRemoteServer(server);
    const { servers } = get();
    const idx = servers.findIndex((s) => s.id === server.id);
    if (idx >= 0) {
      const updated = [...servers];
      updated[idx] = server;
      set({ servers: updated });
    } else {
      set({ servers: [...servers, server] });
    }
  },

  deleteServer: async (id) => {
    await apiDeleteRemoteServer(id);
    const { servers, activeServerId } = get();
    set({
      servers: servers.filter((s) => s.id !== id),
      activeServerId: activeServerId === id ? null : activeServerId,
    });
  },

  testConnection: async (server) => {
    set((state) => ({
      connectionStatuses: {
        ...state.connectionStatuses,
        [server.id]: { status: "Connecting" },
      },
    }));
    try {
      const status = await testRemoteConnection(server);
      set((state) => ({
        connectionStatuses: {
          ...state.connectionStatuses,
          [server.id]: status,
        },
      }));
      // Auto-init remote config on first successful connection
      if (status.status === "Connected") {
        try {
          await remoteInitConfig(server.id);
        } catch {
          // Non-fatal: init may fail if dirs already exist
        }
      }
      return status;
    } catch (err) {
      const errorStatus: ConnectionStatus = {
        status: "Error",
        message: String(err),
      };
      set((state) => ({
        connectionStatuses: {
          ...state.connectionStatuses,
          [server.id]: errorStatus,
        },
      }));
      return errorStatus;
    }
  },

  disconnect: async (serverId) => {
    await disconnectRemote(serverId);
    set((state) => ({
      connectionStatuses: {
        ...state.connectionStatuses,
        [serverId]: { status: "Disconnected" },
      },
      activeServerId:
        state.activeServerId === serverId ? null : state.activeServerId,
    }));
  },

  refreshConnectionStatus: async (serverId) => {
    try {
      const status = await getConnectionStatus(serverId);
      set((state) => ({
        connectionStatuses: {
          ...state.connectionStatuses,
          [serverId]: status,
        },
      }));
    } catch {
      // ignore
    }
  },

  setActiveServer: async (serverId) => {
    set({ activeServerId: serverId });

    // Trigger global data refresh in all stores
    // Using dynamic imports to avoid circular dependencies
    const { useSkillStore } = await import("./useSkillStore");
    const { useProfileStore } = await import("./useProfileStore");
    const { useProjectStore } = await import("./useProjectStore");

    // Reload data for the new environment
    await Promise.all([
      useSkillStore.getState().scan(),
      useProfileStore.getState().loadProfiles(),
      useProjectStore.getState().loadProjects(),
    ]);
  },

  isRemoteActive: () => get().activeServerId !== null,

  getActiveServer: () => {
    const { servers, activeServerId } = get();
    if (!activeServerId) return null;
    return servers.find((s) => s.id === activeServerId) ?? null;
  },
}));
