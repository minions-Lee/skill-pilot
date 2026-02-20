import { create } from "zustand";
import type { ProjectConfig } from "../types/project";
import {
  listProjects,
  saveProject as apiSaveProject,
  deleteProject as apiDeleteProject,
} from "../utils/tauri";

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
    set({ loading: true });
    try {
      const projects = await listProjects();
      set({ projects, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  saveProject: async (project) => {
    await apiSaveProject(project);
    const { projects } = get();
    const existing = projects.findIndex((p) => p.id === project.id);
    if (existing >= 0) {
      const updated = [...projects];
      updated[existing] = project;
      set({ projects: updated });
    } else {
      set({ projects: [...projects, project] });
    }
  },

  deleteProject: async (id) => {
    await apiDeleteProject(id);
    const { projects, selectedProjectId } = get();
    set({
      projects: projects.filter((p) => p.id !== id),
      selectedProjectId: selectedProjectId === id ? null : selectedProjectId,
    });
  },
}));
