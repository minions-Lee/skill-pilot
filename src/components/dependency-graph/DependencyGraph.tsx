import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-2d";
import { useSkillStore } from "../../store/useSkillStore";

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  repo: string;
  color: string;
}

interface GraphLink extends LinkObject {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Deterministic accent color from a string (Linear-style muted tones). */
function repoColor(repo: string): string {
  const palette = [
    "#5e6ad2", // indigo
    "#4cb782", // green
    "#f2994a", // amber
    "#eb5757", // red
    "#a77bca", // purple
    "#4da7c9", // cyan
    "#d4a259", // gold
    "#7c8ea6", // slate
  ];
  let hash = 0;
  for (let i = 0; i < repo.length; i++) {
    hash = repo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/** Hook to track container dimensions via ResizeObserver. */
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });

    return () => observer.disconnect();
  }, [ref]);

  return size;
}

interface DependencyGraphProps {
  onNavigate?: (skillId: string) => void;
}

export function DependencyGraph({ onNavigate }: DependencyGraphProps) {
  const skills = useSkillStore((s) => s.skills);
  const selectSkill = useSkillStore((s) => s.selectSkill);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined
  );

  const { width, height } = useContainerSize(containerRef);

  const graphData = useMemo<GraphData>(() => {
    const skillMap = new Map(skills.map((s) => [s.name, s]));

    // Determine which skill names participate in a dependency relationship
    const participatingNames = new Set<string>();
    for (const skill of skills) {
      if (skill.dependencies.length > 0) {
        participatingNames.add(skill.name);
        for (const dep of skill.dependencies) {
          participatingNames.add(dep);
        }
      }
    }

    const nodes: GraphNode[] = [];
    const nodeIds = new Set<string>();

    for (const name of participatingNames) {
      const skill = skillMap.get(name);
      const id = skill?.id ?? name;
      if (nodeIds.has(id)) continue;
      nodeIds.add(id);

      nodes.push({
        id,
        name,
        repo: skill?.source_repo ?? "unknown",
        color: repoColor(skill?.source_repo ?? "unknown"),
      });
    }

    const links: GraphLink[] = [];
    for (const skill of skills) {
      for (const dep of skill.dependencies) {
        const targetSkill = skillMap.get(dep);
        const targetId = targetSkill?.id ?? dep;
        if (nodeIds.has(skill.id) && nodeIds.has(targetId)) {
          links.push({ source: skill.id, target: targetId });
        }
      }
    }

    return { nodes, links };
  }, [skills]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      selectSkill(node.id);
      onNavigate?.(node.id);
    },
    [selectSkill, onNavigate]
  );

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name;
      const fontSize = Math.max(10 / globalScale, 2);
      const nodeRadius = Math.max(4, 6 / Math.sqrt(globalScale));

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Draw label
      if (globalScale > 0.4) {
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#ededef";
        ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + nodeRadius + 2);
      }
    },
    []
  );

  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      const timer = setTimeout(() => {
        graphRef.current?.zoomToFit(400, 40);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphData]);

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 text-[var(--color-text-muted)]"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No dependency relationships found.
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Skills with dependencies will appear as a force-directed graph.
          </p>
        </div>
      </div>
    );
  }

  // Build legend from repos in the graph
  const repos = [...new Set(graphData.nodes.map((n) => n.repo))].sort();

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 rounded-lg bg-[var(--color-bg)]/80 border border-[var(--color-border)] p-2.5 backdrop-blur-sm">
        <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
          Repos
        </p>
        <div className="space-y-1">
          {repos.map((repo) => (
            <div key={repo} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: repoColor(repo) }}
              />
              <span className="text-[11px] text-[var(--color-text-secondary)] truncate max-w-[120px]">
                {repo.split("/").pop() ?? repo}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
          {graphData.nodes.length} nodes, {graphData.links.length} edges
        </p>
      </div>

      <ForceGraph2D
        ref={
          graphRef as React.RefObject<
            ForceGraphMethods<GraphNode, GraphLink> | undefined
          >
        }
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="#1b1c1f"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(
          node: GraphNode,
          color: string,
          ctx: CanvasRenderingContext2D
        ) => {
          const r = 6;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeClick={handleNodeClick}
        linkColor={() => "#2e3035"}
        linkWidth={1.5}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
      />
    </div>
  );
}
