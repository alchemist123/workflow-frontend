export interface NodePosition {
  x: number
  y: number
}

export interface NodeMetadata {
  title: string
  description: string
}

export interface NodePolicies {
  timeout_seconds: number
  retry: { max_attempts: number }
  on_error: 'fail' | 'continue' | 'skip'
}

export interface NodeIO {
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
}

export interface CanvasNode {
  id: string
  type: string
  version: string
  position: NodePosition
  metadata: NodeMetadata
  config: Record<string, unknown>
  io: NodeIO
  policies: NodePolicies
}

export interface CanvasEdge {
  id: string
  source: string
  source_handle: string
  target: string
  target_handle: string
  condition: string | null
}

export interface CanvasPayload {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export interface PaletteNode {
  type: string
  version: string
  label: string
  category: string
  color: string
  icon: string
  description: string
  wave: number
  is_trigger: boolean
  is_terminal: boolean
  output_handles: string[]
  config_schema: Record<string, unknown>
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
}

export interface Workflow {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface WorkflowVersion {
  id: string
  workflow_id: string
  version_number: number
  canvas_json: Record<string, unknown>
  ir_json: Record<string, unknown> | null
  validation_errors: string[] | null
  is_valid: boolean
  created_at: string
}

export interface CompileResponse {
  version_id: string
  is_valid: boolean
  errors: string[]
  ir: Record<string, unknown> | null
}

export interface WorkflowExecution {
  id: string
  workflow_id: string
  version_id: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'waiting'
  trigger_payload: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export type NodeCategory = 'triggers' | 'flow' | 'ai' | 'data'
