import { create } from "zustand";
import type { Profile } from "../types/profile";
import {
  listProfiles,
  saveProfile as apiSaveProfile,
  deleteProfile as apiDeleteProfile,
  syncProjectLinks,
} from "../utils/tauri";
import {
  remoteListProfiles,
  remoteSaveProfile,
  remoteDeleteProfile,
  remoteSyncProjectLinks,
} from "../utils/tauri-remote";
import { resolveProjectSkillEntries } from "../utils/resolveProfileSkills";
import { useRemoteStore } from "./useRemoteStore";

/**
 * Re-sync symlinks for all projects that reference the given profileId.
 * Called after a profile is saved or deleted so changes cascade to projects.
 *
 * Uses dynamic import() to avoid circular dependency at module init time.
 */
async function syncProjectsForProfile(profileId: string) {
  const { useProjectStore } = await import("./useProjectStore");
  const { useSkillStore } = await import("./useSkillStore");

  const serverId = useRemoteStore.getState().activeServerId;
  const projects = useProjectStore.getState().projects;
  const skills = useSkillStore.getState().skills;
  const profiles = useProfileStore.getState().profiles;

  const affected = projects.filter((p) => p.profile_ids.includes(profileId));
  for (const project of affected) {
    if (!project.path) continue;
    try {
      const entries = resolveProjectSkillEntries(
        project.profile_ids,
        project.extra_skill_ids,
        profiles,
        skills
      );
      if (serverId) {
        await remoteSyncProjectLinks(serverId, entries, project.path);
      } else {
        await syncProjectLinks(entries, project.path);
      }
    } catch (err) {
      console.error(
        "Cascade sync failed for project:",
        project.name,
        err
      );
    }
  }
}

interface ProfileState {
  profiles: Profile[];
  selectedProfileId: string | null;
  loading: boolean;

  loadProfiles: () => Promise<void>;
  selectProfile: (id: string | null) => void;
  saveProfile: (profile: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  loading: false,

  loadProfiles: async () => {
    const serverId = useRemoteStore.getState().activeServerId;
    set({ loading: true });
    try {
      const profiles = serverId
        ? await remoteListProfiles(serverId)
        : await listProfiles();
      console.log("[ProfileStore] loaded", profiles.length, "profiles:", profiles.map(p => p.id));
      set({ profiles, loading: false });
    } catch (err) {
      console.error("[ProfileStore] loadProfiles failed:", err);
      set({ loading: false });
    }
  },

  selectProfile: (id) => set({ selectedProfileId: id }),

  saveProfile: async (profile) => {
    const serverId = useRemoteStore.getState().activeServerId;
    if (serverId) {
      await remoteSaveProfile(serverId, profile);
    } else {
      await apiSaveProfile(profile);
    }
    const { profiles } = get();
    const existing = profiles.findIndex((p) => p.id === profile.id);
    if (existing >= 0) {
      const updated = [...profiles];
      updated[existing] = profile;
      set({ profiles: updated });
    } else {
      set({ profiles: [...profiles, profile] });
    }

    // Cascade: re-sync all projects that use this profile
    await syncProjectsForProfile(profile.id);
  },

  deleteProfile: async (id) => {
    const serverId = useRemoteStore.getState().activeServerId;
    // Cascade BEFORE removing profile from state (need profile data for resolution)
    await syncProjectsForProfile(id);

    if (serverId) {
      await remoteDeleteProfile(serverId, id);
    } else {
      await apiDeleteProfile(id);
    }
    const { profiles, selectedProfileId } = get();
    set({
      profiles: profiles.filter((p) => p.id !== id),
      selectedProfileId: selectedProfileId === id ? null : selectedProfileId,
    });

    // Cascade again AFTER profile is removed from state (now entries won't include it)
    await syncProjectsForProfile(id);
  },
}));
