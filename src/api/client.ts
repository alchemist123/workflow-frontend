import axios from 'axios'
import type {
  Workflow, WorkflowVersion, CompileResponse, WorkflowExecution,
  CanvasPayload, PaletteNode,
} from '../types/workflow'

const api = axios.create({ baseURL: '/api/v1' })

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

  execute: (workflowId: string, versionId: string, payload?: Record<string, unknown>) =>
    api.post<WorkflowExecution>(`/workflows/${workflowId}/versions/${versionId}/execute`, payload).then(r => r.data),

  listExecutions: (workflowId: string) =>
    api.get<WorkflowExecution[]>(`/workflows/${workflowId}/executions`).then(r => r.data),

  getExecution: (workflowId: string, executionId: string) =>
    api.get<WorkflowExecution>(`/workflows/${workflowId}/executions/${executionId}`).then(r => r.data),

  getNodeLogs: (workflowId: string, executionId: string) =>
    api.get<Array<{ node_id: string; node_type: string; status: string; error: string | null; started_at: string | null; finished_at: string | null }>>(`/workflows/${workflowId}/executions/${executionId}/node_logs`).then(r => r.data),

  packageWorkflow: (workflowId: string, versionId: string) =>
    api.post(`/workflows/${workflowId}/versions/${versionId}/package`).then(r => r.data),

  getDeployStatus: (deployId: string) =>
    api.get(`/workflows/deploys/${deployId}`).then(r => r.data),

  getPalette: () => api.get<PaletteNode[]>('/workflows/palette').then(r => r.data),
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
