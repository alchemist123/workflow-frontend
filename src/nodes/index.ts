// Static node palette metadata — mirrors the backend registry.
// The backend /palette endpoint is authoritative; this is used for offline/initial render.

export interface StaticPaletteNode {
  type: string
  label: string
  category: 'triggers' | 'flow' | 'ai' | 'data'
  color: string
  icon: string
  description: string
  wave: 1 | 2
  is_trigger: boolean
  is_terminal: boolean
  output_handles: string[]
  tool_handles?: string[]       // additional target handles for tool-provision connections
  config_schema?: Record<string, unknown>
}

export const STATIC_PALETTE: StaticPaletteNode[] = [
  // ── Wave 1: Entry ─────────────────────────────────────────────────────────
  // A2A_START is the only entry node. The old HTTP / Schedule / Webhook / Queue
  // triggers were removed when packaging moved to ADK graph workflows served
  // over A2A: a packaged workflow is invoked by a message, not by a path or a
  // cron. Saved canvases are migrated server-side on read.
  {
    type: 'A2A_START', label: 'A2A Start', category: 'triggers',
    color: '#6366f1', icon: 'Play', description: 'Entry point — receives the A2A payload',
    wave: 1, is_trigger: true, is_terminal: false, output_handles: ['output'],
  },
  // ── Wave 1: AI ─────────────────────────────────────────────────────────────
  // Note: the old 'AGENT' type is kept in the backend registry for backward
  // compatibility but is absent here — use ORCHESTRATOR_AGENT + REMOTE_AGENT.
  {
    type: 'ORCHESTRATOR_AGENT', label: 'Orchestrator Agent', category: 'ai',
    color: '#f59e0b', icon: 'BrainCircuit',
    description: 'AI agent that uses connected tools, remote agents & functions',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
    tool_handles: ['tools'],
  },
  {
    type: 'REMOTE_AGENT', label: 'Remote Agent', category: 'ai',
    color: '#6366f1', icon: 'ExternalLink',
    description: 'A2A remote agent endpoint — connect to Orchestrator as a tool',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
  {
    type: 'FUNCTION', label: 'Function', category: 'ai',
    color: '#8b5cf6', icon: 'Code2',
    description: 'Inline Python function — standalone or connect to Orchestrator as a tool',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
  {
    // Both a tool consumer and a tool provider: give it MCP tools and remote
    // agents, and wire it into another agent or a tool group as a sub-agent.
    type: 'LLM_AGENT', label: 'LLM Agent', category: 'ai',
    color: '#10b981', icon: 'Bot',
    description: 'An LLM agent — run it in the flow, or connect it to another agent as a sub-agent',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output'],
    tool_handles: ['tools'],
  },
  {
    type: 'TOOL', label: 'Tool', category: 'ai',
    color: '#3b82f6', icon: 'Wrench', description: 'Execute an MCP tool — standalone or connect to Orchestrator',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
  // ── Wave 1: Tool groups ───────────────────────────────────────────────────
  // A group is a tool, not a graph node: wire tools into it, then wire it into
  // an agent's tools handle. It replaces the old tool_execution_mode setting.
  {
    type: 'SEQUENTIAL_AGENT', label: 'Sequential Tools', category: 'ai',
    color: '#0891b2', icon: 'ListOrdered',
    description: 'Runs connected tools in a set order, one after another',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output'],
    tool_handles: ['tools'],
  },
  {
    type: 'PARALLEL_AGENT', label: 'Parallel Tools', category: 'ai',
    color: '#0d9488', icon: 'Rows3',
    description: 'Runs connected tools at the same time on the same input',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output'],
    tool_handles: ['tools'],
  },
  // ── Wave 1: Flow ──────────────────────────────────────────────────────────
  {
    type: 'CONDITION', label: 'Condition', category: 'flow',
    color: '#ef4444', icon: 'GitBranch', description: 'Branch on expression',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['true', 'false', 'default'],
  },
  {
    type: 'LOOP', label: 'Loop', category: 'flow',
    color: '#f97316', icon: 'RefreshCw',
    description: 'Iterate over a list, or repeat until a condition becomes true',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['loop_body', 'done'],
  },
  {
    type: 'WAIT', label: 'Wait', category: 'flow',
    color: '#64748b', icon: 'Timer',
    description: 'Pause for a fixed time, then continue — held in the running process',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output'],
  },
  {
    type: 'TRANSFORM', label: 'Transform', category: 'flow',
    color: '#64748b', icon: 'Shuffle', description: 'Reshape data',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output'],
  },
  {
    type: 'END', label: 'End', category: 'flow',
    color: '#1e293b', icon: 'Square', description: 'Terminate execution path',
    wave: 1, is_trigger: false, is_terminal: true, output_handles: [],
  },
  // ── Wave 2: Flow ──────────────────────────────────────────────────────────
  {
    type: 'HUMAN_APPROVAL', label: 'Human Approval', category: 'flow',
    color: '#a855f7', icon: 'UserCheck', description: 'Pause and ask a person — the A2A task waits at input-required',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['approved', 'rejected'],
  },
  {
    // The other half of human-in-the-loop: not a decision, but values the
    // workflow needs. One way out, so the answer merges into the payload.
    type: 'HUMAN_INPUT', label: 'Human Input', category: 'flow',
    color: '#8b5cf6', icon: 'MessageSquare',
    description: 'Pause and ask a person for values — the task waits at input-required',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['output'],
  },
  {
    type: 'SUBWORKFLOW', label: 'Sub-workflow', category: 'flow',
    color: '#7c3aed', icon: 'Layers', description: 'Invoke another workflow',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
  {
    type: 'MCP_TOOL', label: 'MCP Tool Call', category: 'ai',
    color: '#2563eb', icon: 'PlugZap',
    description: 'Call one tool on an MCP server',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
  {
    type: 'PARALLEL_FORK', label: 'Parallel Fork', category: 'flow',
    color: '#0d9488', icon: 'GitFork', description: 'Split into parallel branches',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: [],
  },
  {
    type: 'MERGE', label: 'Merge', category: 'flow',
    color: '#0d9488', icon: 'Merge', description: 'Combine parallel branches',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['output'],
  },
  // ── Wave 2: Data ──────────────────────────────────────────────────────────
  {
    type: 'DATASOURCE', label: 'Data Source', category: 'data',
    color: '#0ea5e9', icon: 'Database', description: 'Query DB / API / file',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
]

export const PALETTE_BY_TYPE = Object.fromEntries(STATIC_PALETTE.map(n => [n.type, n]))

export const CATEGORY_COLORS: Record<string, string> = {
  triggers: '#6366f1',
  flow: '#64748b',
  ai: '#f59e0b',
  data: '#0ea5e9',
}

/* ─── The live palette ──────────────────────────────────────────────────────
 *
 * `STATIC_PALETTE` above is a hand-written copy of the backend registry, and
 * it had already drifted: `AGENT` was missing from it entirely, so such a node
 * rendered as an amber "Unknown node type" card. Worse, the drift is silent —
 * nothing compares the two.
 *
 * So the backend's `/workflows/palette` is what the canvas actually draws
 * from, and the static list is what it falls back to when the backend has not
 * answered yet (first paint, or offline). Adding a node type is now a backend
 * change only.
 */

import { useMemo } from 'react'
import { useWorkflowStore } from '../store/workflowStore'
import type { PaletteNode } from '../types/workflow'

/** What the canvas needs to draw a node, from whichever source answered. */
export interface PaletteEntry {
  type: string
  label: string
  category: string
  color: string
  icon: string
  description: string
  wave: number
  is_trigger: boolean
  is_terminal: boolean
  output_handles: string[]
  tool_handles?: string[]
  config_schema?: Record<string, unknown>
}

function fromStatic(n: StaticPaletteNode): PaletteEntry {
  return { ...n }
}

function fromBackend(n: PaletteNode): PaletteEntry {
  return {
    type: n.type,
    label: n.label,
    category: n.category,
    color: n.color,
    icon: n.icon,
    description: n.description,
    wave: n.wave,
    is_trigger: n.is_trigger,
    is_terminal: n.is_terminal,
    output_handles: n.output_handles,
    // Derived by the backend from `accepts_tools`. It used to exist only in
    // the static list, which is why the two could disagree about which nodes
    // have a tools socket.
    tool_handles: n.tool_handles ?? [],
    config_schema: n.config_schema,
  }
}

/** Every node type this build knows about, backend-first. */
export function usePaletteList(): PaletteEntry[] {
  const fetched = useWorkflowStore((s) => s.palette)
  return useMemo(
    () =>
      fetched.length
        ? fetched.map(fromBackend)
        : STATIC_PALETTE.map(fromStatic),
    [fetched],
  )
}

/** The same, keyed by node type. */
export function usePaletteMap(): Record<string, PaletteEntry> {
  const list = usePaletteList()
  return useMemo(
    () => Object.fromEntries(list.map((n) => [n.type, n])),
    [list],
  )
}
