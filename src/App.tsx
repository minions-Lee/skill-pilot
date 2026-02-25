import { useState, useEffect, useCallback } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Sidebar } from "./components/sidebar/Sidebar";

import { SkillGrid } from "./components/skill-grid/SkillGrid";
import { SkillDetail } from "./components/skill-detail/SkillDetail";
import { ProfileEditor } from "./components/profile-editor/ProfileEditor";
import { ProfileApply } from "./components/profile-editor/ProfileApply";
import { ProjectBinder } from "./components/project-binder/ProjectBinder";
import { ProjectEditModal } from "./components/project-binder/ProjectEditModal";
import { ProjectSkillView } from "./components/project-detail/ProjectSkillView";
import { DependencyGraph } from "./components/dependency-graph/DependencyGraph";
import { StatsDashboard } from "./components/stats-dashboard/StatsDashboard";
import { ProfileDetail } from "./components/profile-detail/ProfileDetail";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useSkillStore } from "./store/useSkillStore";
import { useProfileStore } from "./store/useProfileStore";
import { useProjectStore } from "./store/useProjectStore";
import { useRemoteStore } from "./store/useRemoteStore";
import { applyProfileLinks, recordProfileApply } from "./utils/tauri";
import { resolveProfileSkillEntries } from "./utils/resolveProfileSkills";
import type { Profile } from "./types/profile";
import type { ProjectConfig } from "./types/project";

type View = "skills" | "profiles" | "projects" | "graph" | "stats";

export default function App() {
  const [view, setView] = useState<View>("skills");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [applyingProfile, setApplyingProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "servers">("general");
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectConfig | null>(null);

  const scan = useSkillStore((s) => s.scan);
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId);
  const selectSkill = useSkillStore((s) => s.selectSkill);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const projects = useProjectStore((s) => s.projects);
  const selectProject = useProjectStore((s) => s.selectProject);
  const loadServers = useRemoteStore((s) => s.loadServers);

  useEffect(() => {
    loadServers();
    scan();
    loadProfiles();
    loadProjects();
  }, [loadServers, scan, loadProfiles, loadProjects]);

  const handleNewProfile = () => {
    setEditingProfile(null);
    setShowProfileEditor(true);
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setShowProfileEditor(true);
  };

  const handleApplyProfile = (profile: Profile) => {
    setApplyingProfile(profile);
  };

  const handleBack = () => {
    selectSkill(null);
  };

  const handleSelectProfile = (profile: Profile) => {
    setViewingProfile(profile);
    selectSkill(null);
  };

  const handleDeleteProfile = (profile: Profile) => {
    useProfileStore.getState().deleteProfile(profile.id);
    if (viewingProfile?.id === profile.id) setViewingProfile(null);
  };

  const applyProfileToTargets = useCallback(
    async (profileId: string, targetPaths: (string | null)[]) => {
      const skills = useSkillStore.getState().skills;
      const profile = useProfileStore
        .getState()
        .profiles.find((p) => p.id === profileId);
      if (!profile) return;

      const entries = resolveProfileSkillEntries(profile, skills);
      if (entries.length === 0) return;

      for (const targetPath of targetPaths) {
        await applyProfileLinks(entries, targetPath);

        // 配置即链接: 同步更新项目的 profile_ids，确保 UI 能回显
        if (targetPath !== null) {
          const projectStore = useProjectStore.getState();
          const project = projectStore.projects.find(
            (p) => p.path === targetPath
          );
          if (project && !project.profile_ids.includes(profileId)) {
            await projectStore.saveProject({
              ...project,
              profile_ids: [...project.profile_ids, profileId],
            });
          }
        }
      }
      await recordProfileApply(profileId);
      await useSkillStore.getState().scan();
    },
    []
  );

  const handleApplyProfileAction = useCallback(
    async (profileId: string, targetPaths: (string | null)[]) => {
      try {
        await applyProfileToTargets(profileId, targetPaths);
      } catch (err) {
        console.error("Apply profile failed:", err);
      }
      setApplyingProfile(null);
    },
    [applyProfileToTargets]
  );

  const renderMainContent = () => {
    // If a skill is selected, show detail (from any view)
    if (selectedSkillId) {
      return <SkillDetail onBack={handleBack} />;
    }

    // If viewing a profile detail (profiles view)
    if (view === "profiles" && viewingProfile) {
      const freshProfile = useProfileStore.getState().profiles.find((p) => p.id === viewingProfile.id);
      if (!freshProfile) {
        setViewingProfile(null);
        return <SkillGrid />;
      }
      return (
        <ProfileDetail
          profile={freshProfile}
          onEdit={() => {
            setEditingProfile(freshProfile);
            setShowProfileEditor(true);
          }}
          onApply={() => setApplyingProfile(freshProfile)}
          onBack={() => setViewingProfile(null)}
        />
      );
    }

    // If a project is selected (projects view), show its skill list
    if (view === "projects" && selectedProjectId) {
      const selectedProject = projects.find((p) => p.id === selectedProjectId);
      if (selectedProject) {
        return (
          <ProjectSkillView
            key={selectedProjectId}
            project={selectedProject}
            onEdit={() => setEditingProject(selectedProject)}
            onBack={() => selectProject(null)}
          />
        );
      }
    }

    switch (view) {
      case "skills":
        return <SkillGrid />;
      case "profiles":
        return <SkillGrid />;
      case "projects":
        return <ProjectBinder />;
      case "graph":
        return <DependencyGraph onNavigate={() => { setView("skills"); setViewingProfile(null); }} />;
      case "stats":
        return <StatsDashboard />;
    }
  };

  return (
    <>
      <AppShell
        onRefresh={() => scan()}
        sidebar={
          <Sidebar
            currentView={view}
            onViewChange={(v) => {
              setView(v);
              selectSkill(null);
              setViewingProfile(null);
              selectProject(null);
              useSkillStore.getState().setFilterRepo(null);
            }}
            onNewProfile={handleNewProfile}
            onEditProfile={handleEditProfile}
            onApplyProfile={handleApplyProfile}
            onSelectProfile={handleSelectProfile}
            onDeleteProfile={handleDeleteProfile}
            onSettings={() => {
              setSettingsTab("general");
              setShowSettings(true);
            }}
            onManageServers={() => {
              setSettingsTab("servers");
              setShowSettings(true);
            }}
          />
        }
        main={renderMainContent()}
      />

      {showProfileEditor && (
        <ProfileEditor
          profile={editingProfile}
          onSave={async (profile: Profile) => {
            await useProfileStore.getState().saveProfile(profile);
            setShowProfileEditor(false);
            if (viewingProfile?.id === profile.id) setViewingProfile(profile);
          }}
          onClose={() => setShowProfileEditor(false)}
        />
      )}

      {applyingProfile && (
        <ProfileApply
          profile={applyingProfile}
          onApply={handleApplyProfileAction}
          onClose={() => setApplyingProfile(null)}
        />
      )}

      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onSave={async (updated) => {
            await useProjectStore.getState().saveProject(updated);
            setEditingProject(null);
          }}
          onDelete={async (id) => {
            await useProjectStore.getState().deleteProject(id);
            setEditingProject(null);
            selectProject(null);
          }}
          onClose={() => setEditingProject(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          initialTab={settingsTab}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
