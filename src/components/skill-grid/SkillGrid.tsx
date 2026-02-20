import { useRef, useState, useMemo, useCallback, useLayoutEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSkillStore, type GroupBy } from "../../store/useSkillStore";
import type { Skill, LinkStatus } from "../../types/skill";
import { toggleSkillUserLevel, recordToggle } from "../../utils/tauri";
import { SkillFilter } from "./SkillFilter";
import { GroupHeader } from "./GroupHeader";
import { SkillCard } from "./SkillCard";

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

interface SkillGroup {
  key: string;
  title: string;
  skills: Skill[];
}

function groupSkills(skills: Skill[], groupBy: GroupBy): SkillGroup[] {
  switch (groupBy) {
    case "repo": {
      const map = new Map<string, Skill[]>();
      for (const s of skills) {
        const key = s.source_repo || "Unknown";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({ key, title: key, skills: items }));
    }
    case "category": {
      const map = new Map<string, Skill[]>();
      for (const s of skills) {
        const key = s.category || "Uncategorized";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({ key, title: key, skills: items }));
    }
    case "alpha": {
      const map = new Map<string, Skill[]>();
      for (const s of skills) {
        const letter = s.name.charAt(0).toUpperCase() || "#";
        if (!map.has(letter)) map.set(letter, []);
        map.get(letter)!.push(s);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({ key, title: key, skills: items }));
    }
    case "status": {
      const order: LinkStatus[] = ["Active", "Direct", "Inactive", "Broken"];
      const map = new Map<string, Skill[]>();
      for (const s of skills) {
        const key = s.link_status_user;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      }
      return order
        .filter((k) => map.has(k))
        .map((key) => ({ key, title: key, skills: map.get(key)! }));
    }
    default:
      return [{ key: "all", title: "All Skills", skills }];
  }
}

// ---------------------------------------------------------------------------
// Flat virtual-list row types
// ---------------------------------------------------------------------------

type VirtualRow =
  | { type: "header"; groupKey: string; title: string; count: number }
  | { type: "cardRow"; cards: Skill[] };

const HEADER_HEIGHT = 36;
const CARD_ROW_HEIGHT = 128;
const ROW_GAP = 8;

// ---------------------------------------------------------------------------
// SkillGrid
// ---------------------------------------------------------------------------

export function SkillGrid() {
  const filteredSkills = useSkillStore((s) => s.filteredSkills);
  const groupBy = useSkillStore((s) => s.groupBy);
  const selectSkill = useSkillStore((s) => s.selectSkill);
  const selectedSkillId = useSkillStore((s) => s.selectedSkillId);
  const updateSkillLinkStatus = useSkillStore((s) => s.updateSkillLinkStatus);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Track collapsed groups
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((groupKey: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }, []);

  // Responsive columns: measure scroll container width
  const [columns, setColumns] = useState(2);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w >= 900) setColumns(3);
      else setColumns(2);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build flat row list
  const { rows } = useMemo(() => {
    const groups = groupSkills(filteredSkills, groupBy);
    const rows: VirtualRow[] = [];

    for (const group of groups) {
      rows.push({
        type: "header",
        groupKey: group.key,
        title: group.title,
        count: group.skills.length,
      });

      if (!collapsed.has(group.key)) {
        // Chunk skills into rows of `columns`
        for (let i = 0; i < group.skills.length; i += columns) {
          rows.push({
            type: "cardRow",
            cards: group.skills.slice(i, i + columns),
          });
        }
      }
    }

    return { rows, groups };
  }, [filteredSkills, groupBy, collapsed, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      return (row.type === "header" ? HEADER_HEIGHT : CARD_ROW_HEIGHT) + ROW_GAP;
    },
    overscan: 8,
  });

  // Handle toggle link
  const handleToggleLink = useCallback(
    async (skill: Skill) => {
      const isCurrentlyActive =
        skill.link_status_user === "Active" ||
        skill.link_status_user === "Direct";

      const newStatus: LinkStatus = isCurrentlyActive ? "Inactive" : "Active";

      // Optimistic update
      updateSkillLinkStatus(skill.name, newStatus);

      try {
        await toggleSkillUserLevel(
          skill.name,
          skill.source_path,
          isCurrentlyActive
        );
        await recordToggle(skill.name, !isCurrentlyActive);
      } catch {
        // Revert on failure
        updateSkillLinkStatus(skill.name, skill.link_status_user);
      }
    },
    [updateSkillLinkStatus]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <SkillFilter />

      {/* Scrollable virtual list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: "0 20px 16px 20px" }}
      >
        {filteredSkills.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[var(--color-text-muted)]">
              No skills found
            </p>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];

              if (row.type === "header") {
                const isExpanded = !collapsed.has(row.groupKey);
                return (
                  <div
                    key={`h-${row.groupKey}`}
                    className="absolute left-0 w-full"
                    style={{
                      top: virtualRow.start,
                      height: virtualRow.size,
                    }}
                  >
                    <GroupHeader
                      title={row.title}
                      count={row.count}
                      isExpanded={isExpanded}
                      onToggle={() => toggleCollapse(row.groupKey)}
                    />
                  </div>
                );
              }

              // cardRow
              return (
                <div
                  key={`r-${virtualRow.index}`}
                  className="absolute left-0 w-full"
                  style={{
                    top: virtualRow.start,
                    height: virtualRow.size,
                    display: "grid",
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gap: "8px",
                    paddingBottom: `${ROW_GAP}px`,
                  }}
                >
                  {row.cards.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isSelected={selectedSkillId === skill.id}
                      onClick={() => selectSkill(skill.id)}
                      onToggleLink={() => handleToggleLink(skill)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
