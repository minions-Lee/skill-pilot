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
  dependencies: string[];
  raw_content: string;
}
