import { create } from "zustand";
import type { Skill, LinkStatus } from "../types/skill";
import { scanSkillsRepo, recordScan } from "../utils/tauri";

export type GroupBy = "repo" | "category" | "alpha" | "status";

interface SkillState {
  skills: Skill[];
  filteredSkills: Skill[];
  selectedSkillId: string | null;
  repoPath: string;
  searchQuery: string;
  groupBy: GroupBy;
  filterRepo: string | null;
  filterStatus: LinkStatus | null;
  loading: boolean;
  error: string | null;

  setRepoPath: (path: string) => void;
  scan: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setFilterRepo: (repo: string | null) => void;
  setFilterStatus: (status: LinkStatus | null) => void;
  selectSkill: (id: string | null) => void;
  updateSkillLinkStatus: (skillName: string, status: LinkStatus) => void;
}

function applyFilters(
  skills: Skill[],
  searchQuery: string,
  filterRepo: string | null,
  filterStatus: LinkStatus | null
): Skill[] {
  let result = skills;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (filterRepo) {
    result = result.filter((s) => s.source_repo === filterRepo);
  }

  if (filterStatus) {
    result = result.filter((s) => s.link_status_user === filterStatus);
  }

  return result;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  filteredSkills: [],
  selectedSkillId: null,
  repoPath: "/Users/eamanc/Documents/pe/skills",
  searchQuery: "",
  groupBy: "repo",
  filterRepo: null,
  filterStatus: null,
  loading: false,
  error: null,

  setRepoPath: (path) => set({ repoPath: path }),

  scan: async () => {
    const { repoPath, searchQuery, filterRepo, filterStatus } = get();
    set({ loading: true, error: null });
    try {
      const skills = await scanSkillsRepo(repoPath);
      await recordScan();
      const filteredSkills = applyFilters(
        skills,
        searchQuery,
        filterRepo,
        filterStatus
      );
      set({ skills, filteredSkills, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setSearchQuery: (query) => {
    const { skills, filterRepo, filterStatus } = get();
    const filteredSkills = applyFilters(skills, query, filterRepo, filterStatus);
    set({ searchQuery: query, filteredSkills });
  },

  setGroupBy: (groupBy) => set({ groupBy }),

  setFilterRepo: (repo) => {
    const { skills, searchQuery, filterStatus } = get();
    const filteredSkills = applyFilters(skills, searchQuery, repo, filterStatus);
    set({ filterRepo: repo, filteredSkills });
  },

  setFilterStatus: (status) => {
    const { skills, searchQuery, filterRepo } = get();
    const filteredSkills = applyFilters(skills, searchQuery, filterRepo, status);
    set({ filterStatus: status, filteredSkills });
  },

  selectSkill: (id) => set({ selectedSkillId: id }),

  updateSkillLinkStatus: (skillName, status) => {
    const { skills, searchQuery, filterRepo, filterStatus } = get();
    const updated = skills.map((s) =>
      s.name === skillName ? { ...s, link_status_user: status } : s
    );
    const filteredSkills = applyFilters(
      updated,
      searchQuery,
      filterRepo,
      filterStatus
    );
    set({ skills: updated, filteredSkills });
  },
}));
