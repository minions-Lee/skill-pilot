import { invoke } from "@tauri-apps/api/core";
import type { Skill } from "../types/skill";
import type { Profile } from "../types/profile";
import type { ProjectConfig } from "../types/project";
import type {
  RemoteServer,
  ConnectionStatus,
  RemoteFileEntry,
} from "../types/remote";

// ============================================================
// Server configuration management
// ============================================================

export const listRemoteServers = () =>
  invoke<RemoteServer[]>("list_remote_servers");

export const saveRemoteServer = (server: RemoteServer) =>
  invoke<RemoteServer>("save_remote_server", { server });

export const deleteRemoteServer = (id: string) =>
  invoke<void>("delete_remote_server", { id });

export const saveSshCredential = (serverId: string, credential: string) =>
  invoke<void>("save_ssh_credential", { serverId, credential });

// ============================================================
// Connection management
// ============================================================

export const testRemoteConnection = (server: RemoteServer) =>
  invoke<ConnectionStatus>("test_remote_connection", { server });

export const disconnectRemote = (serverId: string) =>
  invoke<void>("disconnect_remote", { serverId });

export const getConnectionStatus = (serverId: string) =>
  invoke<ConnectionStatus>("get_connection_status", { serverId });

export const remoteInitConfig = (serverId: string) =>
  invoke<void>("remote_init_config", { serverId });

// ============================================================
// Remote scanner
// ============================================================

export const remoteScanSkillsRepo = (serverId: string) =>
  invoke<Skill[]>("remote_scan_skills_repo", { serverId });

// ============================================================
// Remote linker
// ============================================================

export const remoteToggleSkillUserLevel = (
  serverId: string,
  skillName: string,
  sourcePath: string,
  currentlyActive: boolean
) =>
  invoke<string>("remote_toggle_skill_user_level", {
    serverId,
    skillName,
    sourcePath,
    currentlyActive,
  });

export const remoteToggleSkillProjectLevel = (
  serverId: string,
  skillName: string,
  sourcePath: string,
  projectPath: string,
  currentlyActive: boolean
) =>
  invoke<string>("remote_toggle_skill_project_level", {
    serverId,
    skillName,
    sourcePath,
    projectPath,
    currentlyActive,
  });

export const remoteSyncProjectLinks = (
  serverId: string,
  skillEntries: [string, string][],
  projectPath: string
) =>
  invoke<string[]>("remote_sync_project_links", {
    serverId,
    skillEntries,
    projectPath,
  });

export const remoteApplyProfileLinks = (
  serverId: string,
  skillEntries: [string, string][],
  targetPath: string | null
) =>
  invoke<string[]>("remote_apply_profile_links", {
    serverId,
    skillEntries,
    targetPath,
  });

export const remoteCleanBrokenLinks = (
  serverId: string,
  targetPath: string | null
) =>
  invoke<string[]>("remote_clean_broken_links", { serverId, targetPath });

export const remoteGetProjectSkillLinks = (
  serverId: string,
  projectPath: string
) =>
  invoke<[string, string, string][]>("remote_get_project_skill_links", {
    serverId,
    projectPath,
  });

export const remoteGetUserSkillLinks = (serverId: string) =>
  invoke<[string, string, boolean][]>("remote_get_user_skill_links", {
    serverId,
  });

// ============================================================
// Remote profiles
// ============================================================

export const remoteListProfiles = (serverId: string) =>
  invoke<Profile[]>("remote_list_profiles", { serverId });

export const remoteSaveProfile = (serverId: string, profile: Profile) =>
  invoke<Profile>("remote_save_profile", { serverId, profile });

export const remoteDeleteProfile = (serverId: string, id: string) =>
  invoke<void>("remote_delete_profile", { serverId, id });

// ============================================================
// Remote projects
// ============================================================

export const remoteListProjects = (serverId: string) =>
  invoke<ProjectConfig[]>("remote_list_projects", { serverId });

export const remoteSaveProject = (
  serverId: string,
  project: ProjectConfig
) =>
  invoke<ProjectConfig>("remote_save_project", { serverId, project });

export const remoteDeleteProject = (serverId: string, id: string) =>
  invoke<void>("remote_delete_project", { serverId, id });

// ============================================================
// Remote shell / file access
// ============================================================

export const remoteListSkillFiles = (
  serverId: string,
  skillDir: string,
  subdir: string
) =>
  invoke<RemoteFileEntry[]>("remote_list_skill_files", {
    serverId,
    skillDir,
    subdir,
  });

export const remoteReadFileContent = (serverId: string, path: string) =>
  invoke<string>("remote_read_file_content", { serverId, path });
