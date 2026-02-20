import { useMemo } from "react";
import { useSkillStore } from "../../store/useSkillStore";
import type { Profile } from "../../types/profile";
import RepoSection from "./RepoSection";
import ProfileList from "./ProfileList";
import ProjectList from "./ProjectList";

type View = "skills" | "profiles" | "projects" | "graph" | "stats";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onNewProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  onApplyProfile: (profile: Profile) => void;
  onSelectProfile: (profile: Profile) => void;
  onDeleteProfile: (profile: Profile) => void;
  onSettings: () => void;
}

/* Linear-style icon for each nav item */
function NavIcon({ view }: { view: View }) {
  const size = 16;
  const props = {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (view) {
    case "skills":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "profiles":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "projects":
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "graph":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="2" />
          <circle cx="4" cy="6" r="2" />
          <circle cx="20" cy="6" r="2" />
          <circle cx="4" cy="18" r="2" />
          <circle cx="20" cy="18" r="2" />
          <line x1="10.5" y1="10.7" x2="5.5" y2="7.3" />
          <line x1="13.5" y1="10.7" x2="18.5" y2="7.3" />
          <line x1="10.5" y1="13.3" x2="5.5" y2="16.7" />
          <line x1="13.5" y1="13.3" x2="18.5" y2="16.7" />
        </svg>
      );
    case "stats":
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
  }
}

const VIEW_ITEMS: { key: View; label: string }[] = [
  { key: "skills", label: "Skills" },
  { key: "profiles", label: "Profiles" },
  { key: "projects", label: "Projects" },
  { key: "graph", label: "Graph" },
  { key: "stats", label: "Stats" },
];

export function Sidebar({
  currentView,
  onViewChange,
  onNewProfile,
  onEditProfile,
  onApplyProfile,
  onSelectProfile,
  onDeleteProfile,
  onSettings,
}: SidebarProps) {
  const skills = useSkillStore((s) => s.skills);

  const activeLinks = useMemo(
    () => skills.filter((s) => s.link_status_user === "Active").length,
    [skills]
  );

  return (
    <div data-sb="root">
      {/* Nav */}
      <nav data-sb="nav">
        {VIEW_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onViewChange(item.key)}
            data-sb="nav-item"
            data-active={currentView === item.key ? "true" : undefined}
          >
            <NavIcon view={item.key} />
            {item.label}
          </button>
        ))}
      </nav>

      <hr data-sb="divider" />

      {/* Context-sensitive list based on active nav */}
      <div data-sb="scroll">
        {currentView === "skills" && (
          <RepoSection />
        )}

        {currentView === "profiles" && (
          <ProfileList
            onNewProfile={onNewProfile}
            onEditProfile={onEditProfile}
            onApplyProfile={onApplyProfile}
            onSelectProfile={onSelectProfile}
            onDeleteProfile={onDeleteProfile}
          />
        )}

        {currentView === "projects" && <ProjectList />}
      </div>

      {/* Stats footer */}
      <div data-sb="footer">
        <span>{skills.length} skills</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--color-success)" }} />
          {activeLinks} active
        </span>
        <button
          type="button"
          onClick={onSettings}
          title="Settings"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            cursor: "default",
            transition: "all 100ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-surface-hover)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
