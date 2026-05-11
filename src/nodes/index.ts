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
  // ── Wave 1: Triggers ──────────────────────────────────────────────────────
  {
    type: 'HTTP_TRIGGER', label: 'HTTP Trigger', category: 'triggers',
    color: '#6366f1', icon: 'Webhook', description: 'Start via HTTP request',
    wave: 1, is_trigger: true, is_terminal: false, output_handles: ['output'],
  },
  {
    type: 'SCHEDULE_TRIGGER', label: 'Schedule', category: 'triggers',
    color: '#8b5cf6', icon: 'Clock', description: 'Start on cron schedule',
    wave: 1, is_trigger: true, is_terminal: false, output_handles: ['output'],
  },
  {
    type: 'WEBHOOK_TRIGGER', label: 'Webhook', category: 'triggers',
    color: '#06b6d4', icon: 'Zap', description: 'Start via unique webhook URL',
    wave: 1, is_trigger: true, is_terminal: false, output_handles: ['output'],
  },
  // ── Wave 1: AI ─────────────────────────────────────────────────────────────
  // Note: old 'AGENT' type is kept in the backend registry for backward compat
  // but removed from the palette — use ORCHESTRATOR_AGENT + REMOTE_AGENT instead.
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
    type: 'MODEL', label: 'Model', category: 'ai',
    color: '#10b981', icon: 'Brain', description: 'Direct LLM call',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output'],
  },
  {
    type: 'TOOL', label: 'Tool', category: 'ai',
    color: '#3b82f6', icon: 'Wrench', description: 'Execute an MCP tool — standalone or connect to Orchestrator',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['output', 'error'],
  },
  // ── Wave 1: Flow ──────────────────────────────────────────────────────────
  {
    type: 'CONDITION', label: 'Condition', category: 'flow',
    color: '#ef4444', icon: 'GitBranch', description: 'Branch on expression',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['true', 'false', 'default'],
  },
  {
    type: 'LOOP', label: 'Loop', category: 'flow',
    color: '#f97316', icon: 'RefreshCw', description: 'Iterate over a list',
    wave: 1, is_trigger: false, is_terminal: false, output_handles: ['loop_body', 'done'],
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
  // ── Wave 2: Triggers ──────────────────────────────────────────────────────
  {
    type: 'QUEUE_TRIGGER', label: 'Queue Trigger', category: 'triggers',
    color: '#f43f5e', icon: 'Inbox', description: 'Start from queue message',
    wave: 2, is_trigger: true, is_terminal: false, output_handles: ['output'],
  },
  // ── Wave 2: Flow ──────────────────────────────────────────────────────────
  {
    type: 'HUMAN_APPROVAL', label: 'Human Approval', category: 'flow',
    color: '#a855f7', icon: 'UserCheck', description: 'Wait for human sign-off',
    wave: 2, is_trigger: false, is_terminal: false, output_handles: ['approved', 'rejected'],
  },
  {
    type: 'SUBWORKFLOW', label: 'Sub-workflow', category: 'flow',
    color: '#7c3aed', icon: 'Layers', description: 'Invoke another workflow',
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
