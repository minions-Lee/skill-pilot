import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSkillStore } from "../../store/useSkillStore";
import { toggleSkillUserLevel, recordToggle } from "../../utils/tauri";
import { MarkdownView } from "./MarkdownView";
import { LinkStatus } from "./LinkStatus";

interface SkillDetailProps {
  onBack: () => void;
}

interface FileEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
}

type Tab = "skill-md" | "references" | "scripts";

export function SkillDetail({ onBack }: SkillDetailProps) {
  const skills = useSkillStore((s) => s.skills);
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId);
  const updateSkillLinkStatus = useSkillStore((s) => s.updateSkillLinkStatus);

  const skill = skills.find((s) => s.id === selectedSkillId) ?? null;

  const [activeTab, setActiveTab] = useState<Tab>("skill-md");
  const [refFiles, setRefFiles] = useState<FileEntry[]>([]);
  const [scriptFiles, setScriptFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);

  // Reset state when skill changes
  useEffect(() => {
    setActiveTab("skill-md");
    setSelectedFile(null);
    setFileContent("");
    setRefFiles([]);
    setScriptFiles([]);
  }, [selectedSkillId]);

  // Load file list when tab changes
  useEffect(() => {
    if (!skill) return;
    if (activeTab === "skill-md") return;

    const subdir = activeTab === "references" ? "references" : "scripts";
    setLoadingFiles(true);
    setSelectedFile(null);
    setFileContent("");

    invoke<FileEntry[]>("list_skill_files", {
      skillDir: skill.source_path,
      subdir,
    })
      .then((files) => {
        if (activeTab === "references") setRefFiles(files);
        else setScriptFiles(files);
        setLoadingFiles(false);
      })
      .catch((err) => {
        console.error("Failed to list files:", err);
        setLoadingFiles(false);
      });
  }, [skill, activeTab]);

  // Load file content when a file is selected
  useEffect(() => {
    if (!selectedFile) {
      setFileContent("");
      return;
    }
    setLoadingContent(true);
    invoke<string>("read_file_content", { path: selectedFile.path })
      .then((content) => {
        setFileContent(content);
        setLoadingContent(false);
      })
      .catch((err) => {
        setFileContent(`Error: ${err}`);
        setLoadingContent(false);
      });
  }, [selectedFile]);

  const handleToggle = useCallback(async () => {
    if (!skill) return;
    const currentlyActive =
      skill.link_status_user === "Active" ||
      skill.link_status_user === "Direct";
    try {
      await toggleSkillUserLevel(skill.name, skill.source_path, currentlyActive);
      const newStatus = currentlyActive ? "Inactive" : "Active";
      updateSkillLinkStatus(skill.name, newStatus);
      await recordToggle(skill.name, !currentlyActive);
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  }, [skill, updateSkillLinkStatus]);

  const handleOpenInFinder = useCallback(async () => {
    if (!skill) return;
    try {
      await invoke("reveal_in_finder", { path: skill.source_path });
    } catch (err) {
      console.error("Failed to open in Finder:", err);
    }
  }, [skill]);

  if (!skill) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[13px] text-[var(--color-text-muted)]">
          Skill not found
        </p>
      </div>
    );
  }

  const repoLabel = skill.source_repo.split("/").pop() ?? skill.source_repo;
  const currentFiles = activeTab === "references" ? refFiles : scriptFiles;

  // Build available tabs
  const tabs: { key: Tab; label: string; available: boolean }[] = [
    { key: "skill-md", label: "SKILL.md", available: true },
    { key: "references", label: "References", available: skill.has_references },
    { key: "scripts", label: "Scripts", available: skill.has_scripts },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div
        className="flex items-center gap-3 border-b border-[var(--color-border)]"
        style={{ padding: "8px 20px", flexShrink: 0 }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md text-[13px] text-[var(--color-text-secondary)]
                     hover:text-[var(--color-text)] transition-colors cursor-default"
          style={{ padding: "4px 8px", background: "none", border: "none" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="h-4 w-px bg-[var(--color-border)]" />
        <h1 className="text-[14px] font-semibold text-[var(--color-text)] truncate">
          {skill.name}
        </h1>
        <span
          className="shrink-0 inline-flex items-center rounded-full bg-[var(--color-accent-dim)] text-[11px] font-medium text-[var(--color-accent)]"
          style={{ padding: "2px 8px" }}
        >
          {repoLabel}
        </span>
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 border-b border-[var(--color-border)]"
        style={{ padding: "0 20px", flexShrink: 0 }}
      >
        {tabs.filter((t) => t.available).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 500 : 400,
              color: activeTab === tab.key ? "var(--color-text)" : "var(--color-text-secondary)",
              borderBottom: activeTab === tab.key ? "2px solid var(--color-accent)" : "2px solid transparent",
              background: "none",
              border: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: activeTab === tab.key ? "var(--color-accent)" : "transparent",
              cursor: "default",
              transition: "all 100ms",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 24 }}>
        {activeTab === "skill-md" && (
          <SkillMdTab skill={skill} repoLabel={repoLabel} handleToggle={handleToggle} handleOpenInFinder={handleOpenInFinder} />
        )}

        {(activeTab === "references" || activeTab === "scripts") && (
          <FileExplorerTab
            files={currentFiles}
            loading={loadingFiles}
            selectedFile={selectedFile}
            fileContent={fileContent}
            loadingContent={loadingContent}
            onSelectFile={setSelectedFile}
            subdir={activeTab}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- SKILL.md tab (original detail layout) ---------- */

function SkillMdTab({
  skill,
  repoLabel,
  handleToggle,
  handleOpenInFinder,
}: {
  skill: {
    description: string;
    raw_content: string;
    tags: string[];
    category: string | null;
    has_scripts: boolean;
    has_references: boolean;
    dependencies: string[];
    link_status_user: string;
    name: string;
  };
  repoLabel: string;
  handleToggle: () => void;
  handleOpenInFinder: () => void;
}) {
  return (
    <div
      className="mx-auto"
      style={{ maxWidth: 960, display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}
    >
      {/* Left: content */}
      <div>
        <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed" style={{ marginBottom: 16 }}>
          {skill.description}
        </p>
        <hr className="border-[var(--color-border)]" style={{ marginBottom: 16 }} />
        <MarkdownView content={skill.raw_content} />
      </div>

      {/* Right: metadata */}
      <div className="space-y-4">
        {/* Link Status */}
        <MetaCard title="Link Status">
          <LinkStatus
            status={skill.link_status_user as any}
            onToggle={handleToggle}
            skillName={skill.name}
          />
        </MetaCard>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <MetaCard title="Tags">
            <div className="flex flex-wrap gap-1.5">
              {skill.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md text-[11px] font-medium"
                  style={{
                    padding: "2px 8px",
                    backgroundColor: tagColor(tag, 0.15),
                    color: tagColor(tag, 1),
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </MetaCard>
        )}

        {/* Info */}
        <MetaCard title="Info">
          <div className="space-y-2 text-[12px]">
            {skill.category && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">Category</span>
                <span className="text-[var(--color-text-secondary)]">{skill.category}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Repository</span>
              <span className="text-[var(--color-text-secondary)] truncate ml-2">{repoLabel}</span>
            </div>
            {skill.has_scripts && (
              <div className="flex items-center gap-1.5 text-[var(--color-warning)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Has scripts
              </div>
            )}
            {skill.has_references && (
              <div className="flex items-center gap-1.5 text-[var(--color-info)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Has references
              </div>
            )}
          </div>
        </MetaCard>

        {/* Dependencies */}
        {skill.dependencies.length > 0 && (
          <MetaCard title={`Dependencies (${skill.dependencies.length})`}>
            <ul className="space-y-1">
              {skill.dependencies.map((dep) => (
                <li key={dep} className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-text-muted)]">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="truncate">{dep}</span>
                </li>
              ))}
            </ul>
          </MetaCard>
        )}

        {/* Open in Finder */}
        <button
          type="button"
          onClick={handleOpenInFinder}
          className="flex items-center gap-2 w-full rounded-md border border-[var(--color-border)]
                     text-[13px] text-[var(--color-text-secondary)]
                     hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]
                     transition-colors duration-150"
          style={{ padding: "8px 12px" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Open in Finder
        </button>
      </div>
    </div>
  );
}

/* ---------- File explorer tab ---------- */

function FileExplorerTab({
  files,
  loading,
  selectedFile,
  fileContent,
  loadingContent,
  onSelectFile,
  subdir,
}: {
  files: FileEntry[];
  loading: boolean;
  selectedFile: FileEntry | null;
  fileContent: string;
  loadingContent: boolean;
  onSelectFile: (file: FileEntry | null) => void;
  subdir: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <p className="text-[13px] text-[var(--color-text-muted)]">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No {subdir} files found
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 960 }}>
      {selectedFile ? (
        /* File content view */
        <div>
          <button
            type="button"
            onClick={() => onSelectFile(null)}
            className="flex items-center gap-1.5 rounded-md text-[13px] text-[var(--color-text-secondary)]
                       hover:text-[var(--color-text)] transition-colors cursor-default"
            style={{ padding: "4px 0", marginBottom: 12, background: "none", border: "none" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to file list
          </button>
          <div
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
            style={{ padding: 16 }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
              <FileIcon name={selectedFile.name} />
              <span className="text-[13px] font-medium text-[var(--color-text)]">
                {selectedFile.name}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] ml-auto">
                {formatSize(selectedFile.size)}
              </span>
            </div>
            {loadingContent ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">Loading...</p>
            ) : isImageFile(selectedFile.name) ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Image preview not supported. Use "Open in Finder" to view.
              </p>
            ) : isMarkdownFile(selectedFile.name) ? (
              <MarkdownView content={fileContent} />
            ) : (
              <pre
                className="text-[12px] leading-relaxed text-[var(--color-text-secondary)] overflow-x-auto"
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {fileContent}
              </pre>
            )}
          </div>
        </div>
      ) : (
        /* File list view */
        <div className="space-y-1">
          {files.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => {
                if (!isImageFile(file.name)) onSelectFile(file);
              }}
              className="flex items-center gap-3 w-full rounded-md border border-[var(--color-border)]
                         text-left text-[13px] text-[var(--color-text-secondary)]
                         hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]
                         transition-colors duration-100"
              style={{ padding: "10px 14px" }}
            >
              <FileIcon name={file.name} />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                {formatSize(file.size)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function MetaCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" style={{ padding: 12 }}>
      <h3 className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider" style={{ marginBottom: 8 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  let color = "var(--color-text-muted)";
  if (["md", "txt", "rst"].includes(ext)) color = "var(--color-info)";
  else if (["js", "ts", "jsx", "tsx", "py", "sh", "bash", "zsh", "rb", "rs"].includes(ext)) color = "var(--color-warning)";
  else if (["json", "yaml", "yml", "toml"].includes(ext)) color = "var(--color-success)";
  else if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) color = "var(--color-accent)";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function isMarkdownFile(name: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(name);
}

function isImageFile(name: string): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(name);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tagColor(tag: string, alpha: number): string {
  const palette = [
    [94, 106, 210], [76, 183, 130], [242, 153, 74], [235, 87, 87],
    [167, 123, 202], [77, 167, 201], [212, 162, 89], [124, 142, 166],
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const [r, g, b] = palette[Math.abs(hash) % palette.length];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
