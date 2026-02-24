mod commands;
mod error;
mod models;
mod ssh;

use commands::{linker, profiles, projects, remote, scanner, shell, stats};
use ssh::connection::SshPool;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(SshPool::new())
        .invoke_handler(tauri::generate_handler![
            // Scanner
            scanner::scan_skills_repo,
            scanner::refresh_link_statuses,
            // Linker
            linker::toggle_skill_user_level,
            linker::toggle_skill_project_level,
            linker::apply_profile_links,
            linker::sync_project_links,
            linker::clean_broken_links,
            linker::get_user_skill_links,
            linker::get_project_skill_links,
            // Profiles
            profiles::list_profiles,
            profiles::save_profile,
            profiles::delete_profile,
            profiles::get_profile,
            // Projects
            projects::list_projects,
            projects::save_project,
            projects::delete_project,
            // Stats
            stats::get_stats,
            stats::record_toggle,
            stats::record_profile_apply,
            stats::record_scan,
            stats::record_clean,
            // Shell
            shell::reveal_in_finder,
            shell::list_skill_files,
            shell::read_file_content,
            // Remote: server management
            remote::list_remote_servers,
            remote::save_remote_server,
            remote::delete_remote_server,
            remote::save_ssh_credential,
            // Remote: connection
            remote::test_remote_connection,
            remote::disconnect_remote,
            remote::get_connection_status,
            remote::remote_init_config,
            // Remote: scanner
            remote::remote_scan_skills_repo,
            // Remote: linker
            remote::remote_toggle_skill_user_level,
            remote::remote_toggle_skill_project_level,
            remote::remote_sync_project_links,
            remote::remote_apply_profile_links,
            remote::remote_clean_broken_links,
            remote::remote_get_project_skill_links,
            remote::remote_get_user_skill_links,
            // Remote: profiles
            remote::remote_list_profiles,
            remote::remote_save_profile,
            remote::remote_delete_profile,
            // Remote: projects
            remote::remote_list_projects,
            remote::remote_save_project,
            remote::remote_delete_project,
            // Remote: shell
            remote::remote_list_skill_files,
            remote::remote_read_file_content,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
