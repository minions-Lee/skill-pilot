import { useEffect } from "react";
import { useProfileStore } from "../../store/useProfileStore";
import type { Profile } from "../../types/profile";

interface ProfileListProps {
  onNewProfile: () => void;
  onEditProfile: (profile: Profile) => void;
  onApplyProfile: (profile: Profile) => void;
  onSelectProfile: (profile: Profile) => void;
  onDeleteProfile: (profile: Profile) => void;
}

export default function ProfileList({
  onNewProfile,
  onEditProfile,
  onApplyProfile,
  onSelectProfile,
  onDeleteProfile,
}: ProfileListProps) {
  const profiles = useProfileStore((s) => s.profiles);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);
  const loading = useProfileStore((s) => s.loading);

  useEffect(() => {
    if (profiles.length === 0 && !loading) {
      loadProfiles();
    }
  }, [profiles.length, loading, loadProfiles]);

  function handleClick(profile: Profile) {
    const newId = selectedProfileId === profile.id ? null : profile.id;
    selectProfile(newId);
    if (newId) onSelectProfile(profile);
  }

  return (
    <div data-sb="item-list">
      {profiles.length === 0 && !loading && (
        <p data-sb="item" style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          No profiles yet
        </p>
      )}

      {loading && profiles.length === 0 && (
        <p data-sb="item" style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          Loading...
        </p>
      )}

      {profiles.map((profile) => {
        const isSelected = selectedProfileId === profile.id;
        const skillCount = profile.skill_ids.length;

        return (
          <div
            key={profile.id}
            data-sb="item"
            data-active={isSelected ? "true" : undefined}
            className="group"
          >
            <button
              type="button"
              onClick={() => handleClick(profile)}
              style={{
                display: "flex",
                minWidth: 0,
                flex: 1,
                alignItems: "center",
                gap: 10,
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "default",
                padding: 0,
                fontSize: "inherit",
              }}
            >
              <span
                data-sb="dot"
                style={{ backgroundColor: profile.color }}
              />
              <span data-sb="item-label" style={{ textAlign: "left" }}>
                {profile.name}
              </span>
              <span data-sb="count">
                {skillCount}
              </span>
            </button>

            {/* Context actions (visible on hover) */}
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                title="Edit profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProfile(profile);
                }}
                className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                style={{ background: "none", border: "none", cursor: "default" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.05 10.476a1.75 1.75 0 0 0-.434.726l-.775 2.907a.75.75 0 0 0 .932.932l2.907-.775a1.75 1.75 0 0 0 .726-.434l7.963-7.963a1.75 1.75 0 0 0 0-2.475l-.881-.881Z" />
                </svg>
              </button>
              <button
                type="button"
                title="Apply profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyProfile(profile);
                }}
                className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
                style={{ background: "none", border: "none", cursor: "default" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
                  <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                type="button"
                title="Delete profile"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProfile(profile);
                }}
                className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-danger)]"
                style={{ background: "none", border: "none", cursor: "default" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
                  <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onNewProfile}
        data-sb="item"
        style={{ color: "var(--color-accent)", marginTop: 4 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          width={14}
          height={14}
        >
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        New Profile
      </button>
    </div>
  );
}
