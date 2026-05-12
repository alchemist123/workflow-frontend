import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { PALETTE_BY_TYPE } from './index'
import { useWorkflowStore } from '../store/workflowStore'
import * as Icons from 'lucide-react'

interface WorkflowNodeData {
  type: string
  metadata?: { title?: string; description?: string }
  config?: Record<string, unknown>
  selected?: boolean
  [key: string]: unknown
}

function getIcon(iconName: string, size = 18): React.ReactNode {
  const LucideIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[iconName]
  return LucideIcon ? <LucideIcon size={size} color="white" /> : null
}


function NodeStatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <div className="absolute -top-2 -right-2 z-10 bg-white rounded-full shadow-md border border-green-200">
        <CheckCircle size={16} className="text-green-500" />
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="absolute -top-2 -right-2 z-10 bg-white rounded-full shadow-md border border-red-200">
        <XCircle size={16} className="text-red-500" />
      </div>
    )
  }
  if (status === 'running') {
    return (
      <div className="absolute -top-2 -right-2 z-10 bg-white rounded-full shadow-md border border-blue-200 p-0.5">
        <Loader2 size={12} className="text-blue-500 animate-spin" />
      </div>
    )
  }
  return null
}

// ── Generic node (all types except ORCHESTRATOR_AGENT) ────────────────────────

const WorkflowNode = memo(({ data, id, selected }: NodeProps) => {
  const nodeData = data as WorkflowNodeData
  const nodeType = nodeData.type as string
  const palette = PALETTE_BY_TYPE[nodeType]
  const nodeStatus = useWorkflowStore((s) => s.nodeStatus[id])
  if (!palette) return null

  const title = (nodeData.metadata as { title?: string })?.title || palette.label
  const description = (nodeData.metadata as { description?: string })?.description

  const borderColor = nodeStatus === 'success'
    ? 'border-green-400 shadow-green-100'
    : nodeStatus === 'failed'
    ? 'border-red-400 shadow-red-100'
    : selected
    ? 'border-blue-400 shadow-blue-200'
    : 'border-transparent'

  return (
    <div
      className={`rounded-xl shadow-lg border-2 min-w-[180px] transition-all relative ${borderColor}`}
      style={{ background: '#fff' }}
    >
      {nodeStatus && <NodeStatusBadge status={nodeStatus} />}

      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl" style={{ background: palette.color }}>
        <span className="flex-shrink-0">{getIcon(palette.icon)}</span>
        <span className="text-white text-xs font-semibold truncate flex-1">{title}</span>
        <span className="text-white/60 text-[10px] uppercase tracking-wider flex-shrink-0">{palette.category}</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-gray-500 text-[11px] leading-tight">{description || palette.description}</p>
        {nodeData.config && Object.keys(nodeData.config).length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {Object.entries(nodeData.config as Record<string, unknown>)
              .filter(([, v]) => typeof v !== 'object' && typeof v !== 'undefined')
              .slice(0, 3)
              .map(([k, v]) => (
                <div key={k} className="flex gap-1 text-[10px]">
                  <span className="text-gray-400 font-medium">{k}:</span>
                  <span className="text-gray-600 truncate max-w-[110px]">{String(v)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {!palette.is_trigger && (
        <Handle type="target" position={Position.Left} id="input"
          style={{ background: palette.color, border: '2px solid white' }} />
      )}

      {palette.tool_handles?.map((handle, i) => {
        const total = palette.tool_handles!.length
        const leftPct = total === 1 ? 50 : 20 + (60 / (total - 1)) * i
        return (
          <Handle key={`tool_${handle}`} type="target" position={Position.Bottom} id={handle}
            style={{ background: '#ffffff', border: `2px solid ${palette.color}`, left: `${leftPct}%`, bottom: -6 }}
            title={`${handle} (connect tools here)`} />
        )
      })}

      {!palette.is_terminal && palette.output_handles.map((handle, i) => {
        const total = palette.output_handles.length
        const topPct = total === 1 ? 50 : 20 + (60 / (total - 1)) * i
        return (
          <Handle key={handle} type="source" position={Position.Right} id={handle}
            style={{ background: palette.color, border: '2px solid white', top: `${topPct}%` }}
            title={handle} />
        )
      })}
    </div>
  )
})
WorkflowNode.displayName = 'WorkflowNode'

// ── Orchestrator Agent (specialized — shows connected tools live) ──────────────

const TOOL_PROVIDER_COLORS: Record<string, string> = {
  TOOL: '#3b82f6',
  DATASOURCE: '#0ea5e9',
  REMOTE_AGENT: '#6366f1',
  FUNCTION: '#8b5cf6',
}

const OrchestratorAgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { nodes, edges } = useWorkflowStore((s) => ({ nodes: s.nodes, edges: s.edges }))
  const nodeStatus = useWorkflowStore((s) => s.nodeStatus[id])
  const nodeData = data as WorkflowNodeData
  const palette = PALETTE_BY_TYPE['ORCHESTRATOR_AGENT']!
  const config = (nodeData.config || {}) as Record<string, unknown>

  const title = (nodeData.metadata as { title?: string })?.title || palette.label
  const framework = 'ADK'
  const executionMode = String(config.tool_execution_mode || 'sequential')
  const outputField = config.output_field ? String(config.output_field) : null

  const connectedTools = edges
    .filter((e) => e.target === id && e.targetHandle === 'tools')
    .map((e) => {
      const src = nodes.find((n) => n.id === e.source)
      return {
        id: e.source,
        type: src?.type || 'unknown',
        label: (src?.data?.metadata as { title?: string })?.title || src?.type || e.source,
      }
    })

  const borderColor = nodeStatus === 'success'
    ? 'border-green-400 shadow-green-100'
    : nodeStatus === 'failed'
    ? 'border-red-400 shadow-red-100'
    : selected
    ? 'border-blue-400 shadow-blue-200'
    : 'border-transparent'

  return (
    <div
      className={`rounded-xl shadow-lg border-2 min-w-[210px] transition-all relative ${borderColor}`}
      style={{ background: '#fff' }}
    >
      {nodeStatus && <NodeStatusBadge status={nodeStatus} />}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl" style={{ background: palette.color }}>
        <span className="flex-shrink-0">{getIcon(palette.icon)}</span>
        <span className="text-white text-xs font-semibold truncate flex-1">{title}</span>
        <span className="text-white/70 text-[10px] font-mono flex-shrink-0">{framework}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        {!!config.model && (
          <p className="text-[10px] text-gray-500 mb-2">
            <span className="text-gray-400">model: </span>
            <span className="font-mono">{String(config.model)}</span>
          </p>
        )}

        {connectedTools.length > 0 ? (
          <div className="border border-gray-100 rounded-lg px-2 py-1.5 bg-gray-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                Tools ({connectedTools.length})
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                executionMode === 'parallel'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {executionMode === 'parallel' ? '⚡ parallel' : '↓ sequential'}
              </span>
            </div>
            {connectedTools.map((tool) => (
              <div key={tool.id} className="flex items-center gap-1.5 py-0.5">
                <span className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: TOOL_PROVIDER_COLORS[tool.type] || '#94a3b8' }} />
                <span className="text-[10px] text-gray-700 font-medium truncate flex-1">{tool.label}</span>
                <span className="text-[9px] text-gray-400 flex-shrink-0">
                  {tool.type.replace('_', ' ').toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-amber-400 italic">
            No tools connected — wire nodes to the ● below
          </p>
        )}

        {outputField && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
            <span className="text-gray-400">out →</span>
            <code className="bg-gray-100 px-1 rounded font-mono">{outputField}</code>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-0 pr-1 pb-1 text-[9px] text-gray-400">
        {palette.output_handles.map((h) => (
          <span key={h} className="leading-3">{h} →</span>
        ))}
      </div>

      <Handle type="target" position={Position.Left} id="input"
        style={{ background: palette.color, border: '2px solid white' }} />

      <Handle type="target" position={Position.Bottom} id="tools"
        style={{ background: '#fff', border: `2px solid ${palette.color}`, bottom: -8, width: 14, height: 14 }}
        title="tools — connect TOOL / DATASOURCE / REMOTE_AGENT / FUNCTION here" />

      {palette.output_handles.map((handle, i) => {
        const total = palette.output_handles.length
        const topPct = total === 1 ? 50 : 20 + (60 / (total - 1)) * i
        return (
          <Handle key={handle} type="source" position={Position.Right} id={handle}
            style={{ background: palette.color, border: '2px solid white', top: `${topPct}%` }}
            title={handle} />
        )
      })}
    </div>
  )
})
OrchestratorAgentNode.displayName = 'OrchestratorAgentNode'

export default WorkflowNode

export const buildNodeTypes = (): Record<string, React.ComponentType<NodeProps>> => {
  const types: Record<string, React.ComponentType<NodeProps>> = {}
  const generic = [
    'HTTP_TRIGGER', 'SCHEDULE_TRIGGER', 'WEBHOOK_TRIGGER', 'QUEUE_TRIGGER',
    'REMOTE_AGENT', 'FUNCTION', 'AGENT', 'MODEL', 'TOOL',
    'CONDITION', 'LOOP', 'TRANSFORM', 'END',
    'DATASOURCE', 'HUMAN_APPROVAL', 'SUBWORKFLOW', 'PARALLEL_FORK', 'MERGE',
  ]
  for (const t of generic) {
    types[t] = WorkflowNode
  }
  types['ORCHESTRATOR_AGENT'] = OrchestratorAgentNode
  return types
}
