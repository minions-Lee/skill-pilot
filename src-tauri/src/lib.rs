mod commands;
mod error;
mod models;

use commands::{linker, profiles, projects, scanner, shell, stats};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Scanner
            scanner::scan_skills_repo,
            scanner::refresh_link_statuses,
            // Linker
            linker::toggle_skill_user_level,
            linker::toggle_skill_project_level,
            linker::apply_profile_links,
            linker::clean_broken_links,
            linker::get_user_skill_links,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
