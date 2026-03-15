import { invoke } from "@tauri-apps/api/core";
import type { AgentDir } from "../types/agent-dir";
import type { Skill } from "../types/skill";
import type { LinkStatus } from "../types/skill";
import type { Profile } from "../types/profile";
import type { ProjectConfig } from "../types/project";

// Scanner
export const scanSkillsRepo = (repoPath: string) =>
  invoke<Skill[]>("scan_skills_repo", { repoPath });

export const refreshLinkStatuses = (skills: Skill[]) =>
  invoke<Skill[]>("refresh_link_statuses", { skills });

// Linker
export const toggleSkillUserLevel = (
  skillName: string,
  sourcePath: string,
  currentlyActive: boolean
) =>
  invoke<Record<string, LinkStatus>>("toggle_skill_user_level", {
    skillName,
    sourcePath,
    currentlyActive,
  });

export const toggleSkillProjectLevel = (
  skillName: string,
  sourcePath: string,
  projectPath: string,
  currentlyActive: boolean
) =>
  invoke<Record<string, LinkStatus>>("toggle_skill_project_level", {
    skillName,
    sourcePath,
    projectPath,
    currentlyActive,
  });

export const applyProfileLinks = (
  skillEntries: [string, string][],
  targetPath: string | null
) =>
  invoke<string[]>("apply_profile_links", { skillEntries, targetPath });

export const syncProjectLinks = (
  skillEntries: [string, string][],
  projectPath: string
) =>
  invoke<string[]>("sync_project_links", { skillEntries, projectPath });

export const getProjectSkillLinks = (projectPath: string) =>
  invoke<[string, string, string][]>("get_project_skill_links", {
    projectPath,
  });

export const getProjectSkillLinksAll = (projectPath: string) =>
  invoke<Record<string, [string, string, string][]>>("get_project_skill_links_all", {
    projectPath,
  });

export const syncAgentDirLinks = (
  sourceDir: string,
  targetDirs: string[],
  isUserLevel: boolean,
  projectPaths: string[]
) =>
  invoke<Record<string, string[]>>("sync_agent_dir_links", {
    sourceDir,
    targetDirs,
    isUserLevel,
    projectPaths,
  });

export const cleanBrokenLinks = (targetPath: string | null) =>
  invoke<string[]>("clean_broken_links", { targetPath });

export const getUserSkillLinks = () =>
  invoke<[string, string, boolean][]>("get_user_skill_links");

// Profiles
export const listProfiles = () => invoke<Profile[]>("list_profiles");
export const saveProfile = (profile: Profile) =>
  invoke<Profile>("save_profile", { profile });
export const deleteProfile = (id: string) =>
  invoke<void>("delete_profile", { id });
export const getProfile = (id: string) =>
  invoke<Profile>("get_profile", { id });

// Projects
export const listProjects = () => invoke<ProjectConfig[]>("list_projects");
export const saveProject = (project: ProjectConfig) =>
  invoke<ProjectConfig>("save_project", { project });
export const deleteProject = (id: string) =>
  invoke<void>("delete_project", { id });

// Agent Dirs
export const listAgentDirs = () => invoke<AgentDir[]>("list_agent_dirs");
export const saveAgentDirs = (dirs: AgentDir[]) =>
  invoke<AgentDir[]>("save_agent_dirs", { dirs });

// Stats
export interface Stats {
  toggle_counts: Record<string, number>;
  profile_apply_counts: Record<string, number>;
  total_scans: number;
  total_links_created: number;
  total_links_removed: number;
  total_broken_cleaned: number;
}

export const getStats = () => invoke<Stats>("get_stats");
export const recordToggle = (skillName: string, created: boolean) =>
  invoke<void>("record_toggle", { skillName, created });
export const recordProfileApply = (profileId: string) =>
  invoke<void>("record_profile_apply", { profileId });
export const recordScan = () => invoke<void>("record_scan");
export const recordClean = (count: number) =>
  invoke<void>("record_clean", { count });
