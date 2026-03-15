export type LinkStatus = "Active" | "Broken" | "Inactive" | "Direct";

export interface Skill {
  id: string;
  name: string;
  description: string;
  source_path: string;
  source_repo: string;
  category: string | null;
  tags: string[];
  has_scripts: boolean;
  has_references: boolean;
  link_status_user: LinkStatus;
  /** 每个 agent dir 的链接状态，key 为 dir 名如 ".claude" */
  link_statuses_by_agent: Record<string, LinkStatus>;
  dependencies: string[];
  raw_content: string;
}
