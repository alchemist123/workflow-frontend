import axios from 'axios'
import type {
  Workflow, WorkflowVersion, CompileResponse, WorkflowExecution,
  CanvasPayload, PaletteNode, RunMode,
} from '../types/workflow'

const api = axios.create({ baseURL: '/api/v1' })

/** One thing a node can read, as offered by the mapping picker. */
export interface NodeInput {
  path: string
  type: string
  source: 'payload' | 'variable'
  from_node: string
  label: string
}

/** What a `tasks/get` against the package came back with. */
export interface TaskLookup {
  found: boolean
  state: string
  task_id: string
  result: unknown
  error: string | null
  input_required: { interrupt_id: string; prompt: string } | null
  duration_ms: number
}

export const workflowApi = {
  list: () => api.get<Workflow[]>('/workflows').then(r => r.data),
  create: (name: string, description = '') =>
    api.post<Workflow>('/workflows', { name, description }).then(r => r.data),
  get: (id: string) => api.get<Workflow>(`/workflows/${id}`).then(r => r.data),
  update: (id: string, data: Partial<Workflow>) =>
    api.patch<Workflow>(`/workflows/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/workflows/${id}`),

  saveCanvas: (workflowId: string, canvas: CanvasPayload) =>
    api.post<CompileResponse>(`/workflows/${workflowId}/versions`, { canvas }).then(r => r.data),

  listVersions: (workflowId: string) =>
    api.get<WorkflowVersion[]>(`/workflows/${workflowId}/versions`).then(r => r.data),

  /**
   * Run a version by driving its generated package over A2A, so a test
   * exercises the artefact that ships rather than a separate code path.
   * Returns immediately; poll getExecution for the outcome.
   */
  test: (workflowId: string, versionId: string, payload: Record<string, unknown>, mode: RunMode) =>
    api.post<WorkflowExecution>(
      `/workflows/${workflowId}/versions/${versionId}/test`,
      { payload, mode },
    ).then(r => r.data),

  /**
   * Answer a run parked on a HUMAN_APPROVAL node.
   *
   * Resumes the parked task: the package keeps the A2A task and the ADK
   * session on disk, so the workflow carries on from the approval node. The
   * same execution row is updated.
   */
  answer: (workflowId: string, executionId: string, response: Record<string, unknown>) =>
    api.post<WorkflowExecution>(
      `/workflows/${workflowId}/executions/${executionId}/answer`,
      { response },
    ).then(r => r.data),

  /**
   * What a node can read, for the field-mapping picker.
   *
   * Takes the live canvas rather than a saved version: the picker is used
   * while editing, before anything is saved.
   */
  nodeInputs: (canvas: unknown, nodeId: string) =>
    api.post<{ inputs: NodeInput[]; opaque: boolean }>(
      '/workflows/node-inputs', { canvas, node_id: nodeId },
    ).then(r => r.data),

  /**
   * Look one A2A task up against a version's package.
   *
   * Read-only: a run parked on a human node stays parked. It answers at all
   * because the package keeps its task store on disk, so a task outlives the
   * process that created it.
   */
  getTask: (workflowId: string, versionId: string, taskId: string) =>
    api.post<TaskLookup>(
      `/workflows/${workflowId}/versions/${versionId}/task`, { task_id: taskId },
    ).then(r => r.data),

  listExecutions: (workflowId: string) =>
    api.get<WorkflowExecution[]>(`/workflows/${workflowId}/executions`).then(r => r.data),

  getExecution: (workflowId: string, executionId: string) =>
    api.get<WorkflowExecution>(`/workflows/${workflowId}/executions/${executionId}`).then(r => r.data),

  getNodeLogs: (workflowId: string, executionId: string) =>
    api.get<Array<{ node_id: string; node_type: string; status: string; error: string | null; started_at: string | null; finished_at: string | null }>>(`/workflows/${workflowId}/executions/${executionId}/node_logs`).then(r => r.data),

  packageWorkflow: (workflowId: string, versionId: string) =>
    api.post<{
      package_dir: string
      compose_command: string
      service_url: string
      service_port: number
      files: string[]
    }>(`/workflows/${workflowId}/versions/${versionId}/package`).then(r => r.data),

  /**
   * Check a canvas without saving it.
   *
   * `saveCanvas` writes a new version row every time, so it cannot be used for
   * live feedback. A full pass is about half a millisecond.
   */
  validate: (canvas: unknown) =>
    api.post<{ findings: Finding[]; is_valid: boolean }>(
      '/workflows/validate', { canvas },
    ).then(r => r.data),

  getPalette: () => api.get<PaletteNode[]>('/workflows/palette').then(r => r.data),

  /**
   * Which socket may be wired to which, and why not when it may not.
   *
   * Fetched rather than reimplemented here: the backend proves this set is
   * exactly what the compiler enforces, and a copy in the browser would be the
   * one version of the rules nothing tests.
   */
  getConnectionRules: () =>
    api.get<ConnectionRules>('/workflows/connection-rules').then(r => r.data),
}

/**
 * One validation result, and the thing on the canvas it is about.
 *
 * `text` is the message as the compile log shows it; `message` is the same
 * sentence without its `Node '<id>' (TYPE)` opening, so the canvas can head it
 * with the node's title instead of an id nobody recognises.
 */
export interface Finding {
  code: string
  severity: 'error' | 'warning'
  text: string
  message: string
  subject: 'node' | 'edge' | 'workflow'
  node_id: string | null
  edge_id: string | null
  handle: string | null
  related_node_ids: string[]
  related_edge_ids: string[]
}

/** One node type's sockets and what each will accept. */
export interface ConnectionRuleType {
  output_handles: string[]
  tool_handles: string[]
  accepts_tools: boolean
  allows_inbound: boolean
  allows_outbound: boolean
  provides_tool: boolean
  is_tool_group: boolean
  is_agent: boolean
  uses_named_routes: boolean
  /** target type -> the handles on it this type may land on */
  connects_to: Record<string, string[]>
}

export interface ConnectionRules {
  tools_handle: string
  input_handle: string
  default_route: string
  types: Record<string, ConnectionRuleType>
  /** "SOURCE>TARGET@handle" -> refusal code. Absent means allowed. */
  refusals: Record<string, string>
  /** refusal code -> sentence, with {source} / {target} / {handle} to fill in. */
  messages: Record<string, string>
  refusal_codes: string[]
  tool_consumers: string[]
  tool_providers: string[]
  tool_groups: string[]
}

/** One tool on an MCP server, as the server described it. */
export interface McpTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  arguments: { name: string; type: string; required: boolean; description: string }[]
}

export const mcpApi = {
  /**
   * Ask an MCP server what tools it has.
   *
   * Answers 200 with an `error` string for a wrong URL or a refused token,
   * because that is something the person editing the node needs to read.
   */
  listTools: (url: string, authToken: string) =>
    api.post<{ tools: McpTool[]; error: string | null }>(
      '/mcp/tools', { url, auth_token: authToken },
    ).then(r => r.data),
}

export const resourceApi = {
  listAgents: () => api.get('/agents').then(r => r.data),
  createAgent: (data: Record<string, unknown>) => api.post('/agents', data).then(r => r.data),
  listModels: () => api.get('/models').then(r => r.data),
  createModel: (data: Record<string, unknown>) => api.post('/models', data).then(r => r.data),
  listTools: () => api.get('/tools').then(r => r.data),
  createTool: (data: Record<string, unknown>) => api.post('/tools', data).then(r => r.data),
}

export default api
