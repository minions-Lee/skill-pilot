import { create } from "zustand";
import type { ProjectConfig } from "../types/project";
import {
  listProjects,
  saveProject as apiSaveProject,
  deleteProject as apiDeleteProject,
  syncProjectLinks,
} from "../utils/tauri";
import {
  remoteListProjects,
  remoteSaveProject,
  remoteDeleteProject,
  remoteSyncProjectLinks,
} from "../utils/tauri-remote";
import { resolveProjectSkillEntries } from "../utils/resolveProfileSkills";
import { useSkillStore } from "./useSkillStore";
import { useProfileStore } from "./useProfileStore";
import { useRemoteStore } from "./useRemoteStore";

interface ProjectState {
  projects: ProjectConfig[];
  selectedProjectId: string | null;
  loading: boolean;

  loadProjects: () => Promise<void>;
  selectProject: (id: string | null) => void;
  saveProject: (project: ProjectConfig) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  loading: false,

  loadProjects: async () => {
    const serverId = useRemoteStore.getState().activeServerId;
    set({ loading: true });
    try {
      const projects = serverId
        ? await remoteListProjects(serverId)
        : await listProjects();
      console.log("[ProjectStore] loaded", projects.length, "projects:", projects.map(p => `${p.name}(profiles:${p.profile_ids.join(",")})`));
      set({ projects, loading: false });
    } catch (err) {
      console.error("[ProjectStore] loadProjects failed:", err);
      set({ loading: false });
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  saveProject: async (project) => {
    const serverId = useRemoteStore.getState().activeServerId;
    if (serverId) {
      await remoteSaveProject(serverId, project);
    } else {
      await apiSaveProject(project);
    }
    const { projects } = get();
    const existing = projects.findIndex((p) => p.id === project.id);
    if (existing >= 0) {
      const updated = [...projects];
      updated[existing] = project;
      set({ projects: updated });
    } else {
      set({ projects: [...projects, project] });
    }

    // Auto-sync symlinks for this project (creates missing + removes stale)
    if (project.path) {
      try {
        const skills = useSkillStore.getState().skills;
        const profiles = useProfileStore.getState().profiles;
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
          "Auto-sync symlinks failed for project:",
          project.name,
          err
        );
      }
    }
  },

  deleteProject: async (id) => {
    const serverId = useRemoteStore.getState().activeServerId;
    if (serverId) {
      await remoteDeleteProject(serverId, id);
    } else {
      await apiDeleteProject(id);
    }
    const { projects, selectedProjectId } = get();
    set({
      projects: projects.filter((p) => p.id !== id),
      selectedProjectId: selectedProjectId === id ? null : selectedProjectId,
    });
  },
}));
