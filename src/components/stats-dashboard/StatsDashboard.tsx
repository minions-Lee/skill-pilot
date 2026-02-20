import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { getStats, type Stats } from "../../utils/tauri";
import { useSkillStore } from "../../store/useSkillStore";
import { useProfileStore } from "../../store/useProfileStore";

const CHART_COLORS = [
  "#5e6ad2", // indigo (accent)
  "#4cb782", // green (success)
  "#f2994a", // amber (warning)
  "#eb5757", // red (danger)
  "#a77bca", // purple
  "#4da7c9", // cyan
  "#d4a259", // gold
  "#7c8ea6", // slate
  "#6e7ae2", // light indigo
  "#5a9e6f", // muted green
];

export function StatsDashboard() {
  const skills = useSkillStore((s) => s.skills);
  const profiles = useProfileStore((s) => s.profiles);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);

  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
    getStats()
      .then(setStats)
      .catch((e) => setError(String(e)));
  }, [loadProfiles]);

  // Top 10 most toggled skills
  const toggleData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.toggle_counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [stats]);

  // Profile usage pie data
  const profileUsageData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.profile_apply_counts)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const profile = profiles.find((p) => p.id === id);
        return {
          name: profile?.name ?? id.slice(0, 8),
          value: count,
          color: profile?.color ?? "#5e6ad2",
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [stats, profiles]);

  // Link health donut
  const linkHealthData = useMemo(() => {
    const counts = { Active: 0, Broken: 0, Inactive: 0, Direct: 0 };
    for (const skill of skills) {
      counts[skill.link_status_user]++;
    }
    return [
      { name: "Active", value: counts.Active, color: "#4cb782" },
      { name: "Broken", value: counts.Broken, color: "#eb5757" },
      { name: "Inactive", value: counts.Inactive, color: "#5e5f63" },
      { name: "Direct", value: counts.Direct, color: "#5e6ad2" },
    ].filter((d) => d.value > 0);
  }, [skills]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--color-danger)]">
          Failed to load stats: {error}
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-[var(--color-text-muted)]">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4" style={{ padding: 20 }}>
        {/* Header */}
        <div>
          <h1 className="text-[14px] font-semibold text-[var(--color-text)]">
            Statistics
          </h1>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
            Usage metrics and link health overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Scans"
            value={stats.total_scans}
            color="var(--color-accent)"
          />
          <SummaryCard
            label="Links Created"
            value={stats.total_links_created}
            color="var(--color-success)"
          />
          <SummaryCard
            label="Links Removed"
            value={stats.total_links_removed}
            color="var(--color-warning)"
          />
          <SummaryCard
            label="Broken Cleaned"
            value={stats.total_broken_cleaned}
            color="var(--color-danger)"
          />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Top toggled skills */}
          <ChartCard title="Top Toggled Skills">
            {toggleData.length === 0 ? (
              <EmptyChart message="No toggle activity yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={toggleData}
                  margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2e3035"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#9b9ca0", fontSize: 10 }}
                    axisLine={{ stroke: "#2e3035" }}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: "#9b9ca0", fontSize: 10 }}
                    axisLine={{ stroke: "#2e3035" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18191c",
                      border: "1px solid #2e3035",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#ededef",
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {toggleData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Profile usage */}
          <ChartCard title="Profile Usage">
            {profileUsageData.length === 0 ? (
              <EmptyChart message="No profiles applied yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={profileUsageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="#1b1c1f"
                  >
                    {profileUsageData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18191c",
                      border: "1px solid #2e3035",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#ededef",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {profileUsageData.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-2">
                {profileUsageData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>

          {/* Link health donut */}
          <ChartCard title="Link Health">
            {linkHealthData.length === 0 ? (
              <EmptyChart message="No skills scanned yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={linkHealthData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    strokeWidth={2}
                    stroke="#1b1c1f"
                  >
                    {linkHealthData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18191c",
                      border: "1px solid #2e3035",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#ededef",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {linkHealthData.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-2">
                {linkHealthData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      {d.name} ({d.value})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold tabular-nums" style={{ color }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <h3 className="text-[13px] font-medium text-[var(--color-text)] mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[260px]">
      <p className="text-xs text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}
