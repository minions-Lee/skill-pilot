export type SshAuthType = "Key" | "Agent" | "Password";

export interface SshAuthKey {
  type: "Key";
  private_key_path: string;
}

export interface SshAuthAgent {
  type: "Agent";
}

export interface SshAuthPassword {
  type: "Password";
}

export type SshAuth = SshAuthKey | SshAuthAgent | SshAuthPassword;

export interface RemoteServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth: SshAuth;
  remote_repo_path: string;
  remote_config_dir?: string | null;
  remote_skills_dir?: string | null;
  connect_timeout_secs?: number | null;
  command_timeout_secs?: number | null;
}

export type ConnectionStatus =
  | { status: "Disconnected" }
  | { status: "Connecting" }
  | { status: "Connected" }
  | { status: "Error"; message: string };

export interface RemoteFileEntry {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
}
