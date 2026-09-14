import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react'
import type { Workflow, WorkflowVersion, CompileResponse, WorkflowExecution, RunMode } from '../types/workflow'
import { workflowApi } from '../api/client'

interface WorkflowState {
  // Canvas state
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null

  // Current workflow
  currentWorkflow: Workflow | null
  currentVersion: WorkflowVersion | null
  lastCompile: CompileResponse | null
  compileWarnings: string[]
  executions: WorkflowExecution[]
  // Sticky across runs: whoever tests in task mode usually keeps testing that way.
  runMode: RunMode

  // Execution node status overlay
  nodeStatus: Record<string, string>  // nodeId -> 'success' | 'failed' | 'running' | ...

  // UI state
  isSaving: boolean
  isExecuting: boolean
  isPackaging: boolean
  sidebarOpen: boolean
  compileErrors: string[]
  packageResult: {
    package_dir: string
    compose_command: string
    service_url: string
    service_port: number
    files: string[]
    error?: string
  } | null

  // Canvas actions
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void
  updateNodeMetadata: (nodeId: string, metadata: { title?: string; description?: string }) => void
  deleteNode: (nodeId: string) => void
  setSelectedNode: (id: string | null) => void

  // Workflow actions
  clearCanvas: () => void
  setCurrentWorkflow: (wf: Workflow) => void
  saveAndCompile: () => Promise<CompileResponse | null>
  testWorkflow: (payload: Record<string, unknown>, mode: RunMode) => Promise<WorkflowExecution | null>
  answerExecution: (executionId: string, response: Record<string, unknown>) => Promise<WorkflowExecution | null>
  packageWorkflow: () => Promise<void>
  loadExecutions: () => Promise<void>
  loadNodeLogs: (workflowId: string, executionId: string) => Promise<void>
  clearNodeStatus: () => void
  setSidebarOpen: (open: boolean) => void
  setRunMode: (mode: RunMode) => void
  clearPackageResult: () => void
  loadCanvas: (version: WorkflowVersion) => void
}

let nodeCounter = 0

/**
 * Config a node needs before it can be wired at all.
 *
 * Almost every node type is usable straight out of the palette and is
 * configured afterwards. PARALLEL_FORK was not: its outgoing handles come from
 * `branches`, so dropping one with an empty config gave a node with no handles
 * on its right-hand side — nothing to drag an edge from — and it could not
 * compile either, since the schema requires at least two branches.
 */
const DEFAULT_CONFIG: Record<string, Record<string, unknown>> = {
  PARALLEL_FORK: { branches: ['branch_1', 'branch_2'] },
}

/**
 * Keep a fork's branch list in sync with the edges actually drawn from it.
 *
 * The canvas is the source of truth for the wiring, and the config has to
 * agree with it or the compiler sees branches nobody connected. Additive on
 * purpose: drawing an edge from a new handle names that branch, but deleting
 * the edge leaves the branch in place — removing it is an explicit act in the
 * config panel, not a side effect of re-routing an edge.
 */
function syncForkBranches(nodes: Node[], edges: Edge[]): Node[] {
  let changed = false
  const next = nodes.map((node) => {
    if (node.type !== 'PARALLEL_FORK') return node
    const config = ((node.data as { config?: Record<string, unknown> })?.config || {})
    const branches = (config.branches as string[]) || []
    const used = edges
      .filter((e) => e.source === node.id)
      .map((e) => e.sourceHandle || 'output')
    const merged = [...branches, ...used.filter((h) => !branches.includes(h))]
    if (merged.length === branches.length) return node
    changed = true
    return { ...node, data: { ...node.data, config: { ...config, branches: merged } } }
  })
  return changed ? next : nodes
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  currentWorkflow: null,
  currentVersion: null,
  lastCompile: null,
  compileWarnings: [],
  executions: [],
  runMode: 'message',
  nodeStatus: {},
  isSaving: false,
  isExecuting: false,
  isPackaging: false,
  packageResult: null,
  sidebarOpen: false,
  compileErrors: [],

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }))
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges)
      return { edges, nodes: syncForkBranches(state.nodes, edges) }
    })
  },

  onConnect: (connection) => {
    const edge: Edge = {
      ...connection,
      id: `edge_${Date.now()}`,
      source: connection.source || '',
      target: connection.target || '',
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    }
    set((state) => {
      const edges = addEdge(edge, state.edges)
      return { edges, nodes: syncForkBranches(state.nodes, edges) }
    })
  },

  addNode: (type, position) => {
    nodeCounter++
    const newNode: Node = {
      id: `node_${Date.now()}_${nodeCounter}`,
      type,
      position,
      data: {
        type,
        metadata: { title: type.replace(/_/g, ' '), description: '' },
        config: { ...(DEFAULT_CONFIG[type] || {}) },
        io: { input_schema: { type: 'object' }, output_schema: { type: 'object' } },
        policies: { timeout_seconds: 60, retry: { max_attempts: 1 }, on_error: 'fail' },
      },
    }
    set((state) => ({ nodes: [...state.nodes, newNode] }))
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
      ),
    }))
  },

  updateNodeMetadata: (nodeId, metadata) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, metadata: { ...(n.data.metadata as object), ...metadata } } }
          : n
      ),
    }))
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }))
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  clearCanvas: () => set({
    nodes: [], edges: [], selectedNodeId: null,
    currentVersion: null, lastCompile: null, compileErrors: [], compileWarnings: [], executions: [], nodeStatus: {},
  }),

  setCurrentWorkflow: (wf) => set({ currentWorkflow: wf }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setRunMode: (mode) => set({ runMode: mode }),

  saveAndCompile: async () => {
    const { currentWorkflow, nodes, edges } = get()
    if (!currentWorkflow) return null

    set({ isSaving: true, compileErrors: [] })

    const canvas = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type!,
        version: '1',
        position: n.position,
        metadata: (n.data.metadata as { title: string; description: string }) || { title: '', description: '' },
        config: (n.data.config as Record<string, unknown>) || {},
        io: (n.data.io as object) || { input_schema: { type: 'object' }, output_schema: { type: 'object' } },
        policies: (n.data.policies as object) || { timeout_seconds: 60, retry: { max_attempts: 1 }, on_error: 'fail' },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        source_handle: e.sourceHandle || 'output',
        target: e.target,
        target_handle: e.targetHandle || 'input',
        condition: null,
      })),
    }

    try {
      const result = await workflowApi.saveCanvas(currentWorkflow.id, canvas as never)
      set({
        lastCompile: result,
        compileErrors: result.errors || [],
        compileWarnings: (result as unknown as { warnings?: string[] }).warnings || [],
        isSaving: false,
      })
      return result
    } catch (err) {
      set({ isSaving: false })
      return null
    }
  },

  testWorkflow: async (payload, mode) => {
    const { currentWorkflow, lastCompile } = get()
    if (!currentWorkflow || !lastCompile?.version_id || !lastCompile.is_valid) return null

    set({ isExecuting: true, nodeStatus: {} })
    try {
      const exec = await workflowApi.test(currentWorkflow.id, lastCompile.version_id, payload, mode)
      set((state) => ({ executions: [exec, ...state.executions], isExecuting: false }))
      return exec
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      set({
        isExecuting: false,
        compileErrors: detail ? [detail] : ['The test run could not be started.'],
      })
      return null
    }
  },

  /** Approve or reject a run waiting on a HUMAN_APPROVAL node. */
  answerExecution: async (executionId, response) => {
    const { currentWorkflow } = get()
    if (!currentWorkflow) return null
    try {
      const exec = await workflowApi.answer(currentWorkflow.id, executionId, response)
      // Replace the row in place: one decision is one run, not two.
      set((state) => ({
        executions: state.executions.map((e) => (e.id === exec.id ? exec : e)),
      }))
      return exec
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      set({ compileErrors: detail ? [detail] : ['The answer could not be submitted.'] })
      return null
    }
  },

  loadExecutions: async () => {
    const { currentWorkflow } = get()
    if (!currentWorkflow) return
    const execs = await workflowApi.listExecutions(currentWorkflow.id)
    set({ executions: execs })
  },

  loadNodeLogs: async (workflowId, executionId) => {
    try {
      const logs = await workflowApi.getNodeLogs(workflowId, executionId)
      const status: Record<string, string> = {}
      for (const log of logs) {
        status[log.node_id] = log.status
      }
      set({ nodeStatus: status })
    } catch {
      // silently ignore — node status is best-effort
    }
  },

  clearNodeStatus: () => set({ nodeStatus: {} }),

  packageWorkflow: async () => {
    const { currentWorkflow, lastCompile } = get()
    if (!currentWorkflow || !lastCompile?.version_id || !lastCompile.is_valid) return
    set({ isPackaging: true, packageResult: null })
    try {
      const result = await workflowApi.packageWorkflow(currentWorkflow.id, lastCompile.version_id)
      set({ isPackaging: false, packageResult: result })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = status === 404
        ? 'Version not found in the database — please Save & Compile again before packaging'
        : err instanceof Error ? err.message : 'Packaging failed'
      // 404 means the compiled version is gone; reset lastCompile so the button re-disables
      set({
        isPackaging: false,
        lastCompile: status === 404 ? null : get().lastCompile,
        packageResult: { package_dir: '', compose_command: '', service_url: '', service_port: 0, files: [], error: message },
      })
    }
  },

  clearPackageResult: () => set({ packageResult: null }),

  loadCanvas: (version) => {
    // The API stores CanvasNode shape (flat: id, type, position, metadata, config, …).
    // React Flow needs Node shape (id, type, position, data: { … }).
    // Transform between the two here so components always see data.type etc.
    type ApiNode = {
      id: string; type: string; position: { x: number; y: number }
      metadata?: unknown; config?: unknown; io?: unknown; policies?: unknown
    }
    type ApiEdge = {
      id: string; source: string; target: string
      source_handle?: string; target_handle?: string
    }
    const canvas = version.canvas_json as { nodes: ApiNode[]; edges: ApiEdge[] }

    const rfNodes: Node[] = (canvas.nodes || []).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        type: n.type,
        metadata: n.metadata || { title: '', description: '' },
        config: n.config || {},
        io: n.io || { input_schema: { type: 'object' }, output_schema: { type: 'object' } },
        policies: n.policies || { timeout_seconds: 60, retry: { max_attempts: 1 }, on_error: 'fail' },
      },
    }))

    const rfEdges: Edge[] = (canvas.edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.source_handle || 'output',
      targetHandle: e.target_handle || 'input',
    }))

    // Restore lastCompile from the loaded version so Package is enabled without
    // re-compiling. A version the backend migrated on read comes back with
    // is_valid=false and the reason in validation_errors, which keeps Run and
    // Package disabled until the user saves the migrated canvas.
    const restoredCompile = version.is_valid
      ? {
          version_id: version.id,
          is_valid: true,
          errors: (version.validation_errors as string[]) || [],
          warnings: [],
          ir: version.ir_json || null,
        }
      : null

    set({
      nodes: rfNodes,
      edges: rfEdges,
      currentVersion: version,
      lastCompile: restoredCompile,
      compileErrors: version.is_valid ? [] : ((version.validation_errors as string[]) || []),
      compileWarnings: [],
    })
  },
}))
