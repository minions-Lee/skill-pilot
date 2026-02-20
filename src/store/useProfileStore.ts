import { create } from "zustand";
import type { Profile } from "../types/profile";
import {
  listProfiles,
  saveProfile as apiSaveProfile,
  deleteProfile as apiDeleteProfile,
} from "../utils/tauri";

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
    set({ loading: true });
    try {
      const profiles = await listProfiles();
      set({ profiles, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectProfile: (id) => set({ selectedProfileId: id }),

  saveProfile: async (profile) => {
    await apiSaveProfile(profile);
    const { profiles } = get();
    const existing = profiles.findIndex((p) => p.id === profile.id);
    if (existing >= 0) {
      const updated = [...profiles];
      updated[existing] = profile;
      set({ profiles: updated });
    } else {
      set({ profiles: [...profiles, profile] });
    }
  },

  deleteProfile: async (id) => {
    await apiDeleteProfile(id);
    const { profiles, selectedProfileId } = get();
    set({
      profiles: profiles.filter((p) => p.id !== id),
      selectedProfileId: selectedProfileId === id ? null : selectedProfileId,
    });
  },
}));
