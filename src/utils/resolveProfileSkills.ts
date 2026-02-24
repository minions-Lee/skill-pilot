import type { Skill } from "../types/skill";
import type { Profile } from "../types/profile";

/**
 * Resolve a single profile's skill_ids to [name, source_path] tuples
 * for passing to applyProfileLinks().
 */
export function resolveProfileSkillEntries(
  profile: Profile,
  skills: Skill[]
): [string, string][] {
  const entries: [string, string][] = [];
  for (const sid of profile.skill_ids) {
    const found = skills.find((s) => s.id === sid || s.name === sid);
    if (found) {
      entries.push([found.name, found.source_path]);
    }
  }
  return entries;
}

/**
 * Resolve all skills for a project (across all assigned profiles + extra_skill_ids).
 * Returns deduplicated [name, source_path] tuples.
 */
export function resolveProjectSkillEntries(
  profileIds: string[],
  extraSkillIds: string[],
  profiles: Profile[],
  skills: Skill[]
): [string, string][] {
  const seen = new Set<string>();
  const entries: [string, string][] = [];

  for (const pid of profileIds) {
    const profile = profiles.find((p) => p.id === pid);
    if (!profile) continue;
    for (const sid of profile.skill_ids) {
      const found = skills.find((s) => s.id === sid || s.name === sid);
      if (found && !seen.has(found.name)) {
        seen.add(found.name);
        entries.push([found.name, found.source_path]);
      }
    }
  }

  for (const sid of extraSkillIds) {
    const found = skills.find((s) => s.id === sid || s.name === sid);
    if (found && !seen.has(found.name)) {
      seen.add(found.name);
      entries.push([found.name, found.source_path]);
    }
  }

  return entries;
}
