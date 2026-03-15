import { create } from "zustand";
import type { Skill, LinkStatus } from "../types/skill";
import { scanSkillsRepo, recordScan, refreshLinkStatuses } from "../utils/tauri";
import { remoteScanSkillsRepo } from "../utils/tauri-remote";
import { useRemoteStore } from "./useRemoteStore";

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
  filterAgentDir: string | null;
  loading: boolean;
  error: string | null;

  setRepoPath: (path: string) => void;
  scan: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  setFilterRepo: (repo: string | null) => void;
  setFilterStatus: (status: LinkStatus | null) => void;
  setFilterAgentDir: (dir: string | null) => void;
  selectSkill: (id: string | null) => void;
  updateSkillLinkStatus: (skillName: string, status: LinkStatus) => void;
  updateSkillLinkStatuses: (skillName: string, statuses: Record<string, LinkStatus>) => void;
  refreshStatuses: () => Promise<void>;
}

function applyFilters(
  skills: Skill[],
  searchQuery: string,
  filterRepo: string | null,
  filterStatus: LinkStatus | null,
  filterAgentDir: string | null
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

  if (filterAgentDir) {
    result = result.filter(
      (s) => (s.link_statuses_by_agent?.[filterAgentDir] ?? "Inactive") !== "Inactive"
    );
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
  filterAgentDir: null,
  loading: false,
  error: null,

  setRepoPath: (path) => set({ repoPath: path }),

  scan: async () => {
    const { repoPath, searchQuery, filterRepo, filterStatus, filterAgentDir } = get();
    const serverId = useRemoteStore.getState().activeServerId;
    set({ loading: true, error: null });
    try {
      const skills = serverId
        ? await remoteScanSkillsRepo(serverId)
        : await scanSkillsRepo(repoPath);
      if (!serverId) await recordScan();
      const filteredSkills = applyFilters(
        skills,
        searchQuery,
        filterRepo,
        filterStatus,
        filterAgentDir
      );
      set({ skills, filteredSkills, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setSearchQuery: (query) => {
    const { skills, filterRepo, filterStatus, filterAgentDir } = get();
    const filteredSkills = applyFilters(skills, query, filterRepo, filterStatus, filterAgentDir);
    set({ searchQuery: query, filteredSkills });
  },

  setGroupBy: (groupBy) => set({ groupBy }),

  setFilterRepo: (repo) => {
    const { skills, searchQuery, filterStatus, filterAgentDir } = get();
    const filteredSkills = applyFilters(skills, searchQuery, repo, filterStatus, filterAgentDir);
    set({ filterRepo: repo, filteredSkills });
  },

  setFilterStatus: (status) => {
    const { skills, searchQuery, filterRepo, filterAgentDir } = get();
    const filteredSkills = applyFilters(skills, searchQuery, filterRepo, status, filterAgentDir);
    set({ filterStatus: status, filteredSkills });
  },

  setFilterAgentDir: (dir) => {
    const { skills, searchQuery, filterRepo, filterStatus } = get();
    const filteredSkills = applyFilters(skills, searchQuery, filterRepo, filterStatus, dir);
    set({ filterAgentDir: dir, filteredSkills });
  },

  selectSkill: (id) => set({ selectedSkillId: id }),

  updateSkillLinkStatus: (skillName, status) => {
    const { skills, searchQuery, filterRepo, filterStatus, filterAgentDir } = get();
    const updated = skills.map((s) =>
      s.name === skillName ? { ...s, link_status_user: status } : s
    );
    const filteredSkills = applyFilters(
      updated,
      searchQuery,
      filterRepo,
      filterStatus,
      filterAgentDir
    );
    set({ skills: updated, filteredSkills });
  },

  updateSkillLinkStatuses: (skillName, statuses) => {
    const { skills, searchQuery, filterRepo, filterStatus, filterAgentDir } = get();
    const updated = skills.map((s) => {
      if (s.name !== skillName) return s;
      return {
        ...s,
        link_status_user: statuses[".claude"] ?? s.link_status_user,
        link_statuses_by_agent: { ...s.link_statuses_by_agent, ...statuses },
      };
    });
    const filteredSkills = applyFilters(
      updated,
      searchQuery,
      filterRepo,
      filterStatus,
      filterAgentDir
    );
    set({ skills: updated, filteredSkills });
  },

  refreshStatuses: async () => {
    const { skills, searchQuery, filterRepo, filterStatus, filterAgentDir } = get();
    if (skills.length === 0) return;
    try {
      const refreshed = await refreshLinkStatuses(skills);
      const filteredSkills = applyFilters(refreshed, searchQuery, filterRepo, filterStatus, filterAgentDir);
      set({ skills: refreshed, filteredSkills });
    } catch (err) {
      console.error("Failed to refresh link statuses:", err);
    }
  },
}));
