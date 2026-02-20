use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Stats {
    /// skill_name -> toggle count
    pub toggle_counts: HashMap<String, u32>,
    /// profile_id -> apply count
    pub profile_apply_counts: HashMap<String, u32>,
    /// Total scans performed
    pub total_scans: u32,
    /// Total links created
    pub total_links_created: u32,
    /// Total links removed
    pub total_links_removed: u32,
    /// Total broken links cleaned
    pub total_broken_cleaned: u32,
}

fn stats_path() -> Result<PathBuf, AppError> {
    let dir = dirs::home_dir()
        .map(|h| h.join(".claude-skill-manager"))
        .ok_or(AppError::ConfigDirNotFound)?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("stats.json"))
}

fn load_stats() -> Result<Stats, AppError> {
    let path = stats_path()?;
    if !path.exists() {
        return Ok(Stats::default());
    }
    let content = fs::read_to_string(&path)?;
    let stats: Stats = serde_json::from_str(&content)?;
    Ok(stats)
}

fn save_stats(stats: &Stats) -> Result<(), AppError> {
    let path = stats_path()?;
    let json = serde_json::to_string_pretty(stats)?;
    fs::write(&path, json)?;
    Ok(())
}

/// Get current stats
#[tauri::command]
pub fn get_stats() -> Result<Stats, AppError> {
    load_stats()
}

/// Record a skill toggle event
#[tauri::command]
pub fn record_toggle(skill_name: String, created: bool) -> Result<(), AppError> {
    let mut stats = load_stats()?;
    *stats.toggle_counts.entry(skill_name).or_insert(0) += 1;
    if created {
        stats.total_links_created += 1;
    } else {
        stats.total_links_removed += 1;
    }
    save_stats(&stats)
}

/// Record a profile apply event
#[tauri::command]
pub fn record_profile_apply(profile_id: String) -> Result<(), AppError> {
    let mut stats = load_stats()?;
    *stats.profile_apply_counts.entry(profile_id).or_insert(0) += 1;
    save_stats(&stats)
}

/// Record a scan event
#[tauri::command]
pub fn record_scan() -> Result<(), AppError> {
    let mut stats = load_stats()?;
    stats.total_scans += 1;
    save_stats(&stats)
}

/// Record broken links cleaned
#[tauri::command]
pub fn record_clean(count: u32) -> Result<(), AppError> {
    let mut stats = load_stats()?;
    stats.total_broken_cleaned += count;
    save_stats(&stats)
}
