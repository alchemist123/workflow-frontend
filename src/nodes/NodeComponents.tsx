import React, { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CheckCircle, XCircle, Loader2, Plus } from 'lucide-react'
import { usePaletteMap } from './index'
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


/**
 * What the compiler has to say about this node, on the node itself.
 *
 * Compile results used to be a flat list of prose in a Toolbar dropdown,
 * naming node ids nobody has ever seen on screen — so there was no way to tell
 * which box was wrong. Each finding now carries the node it concerns, and this
 * is where that lands.
 *
 * The heading is the node's own title; the sentence has had its `Node '<id>'`
 * opening removed by the backend for exactly this.
 */
function NodeFindings({ nodeId, title }: { nodeId: string; title: string }) {
  const findings = useWorkflowStore((s) => s.findings)
  const mine = findings.filter(
    (f) => f.node_id === nodeId || f.related_node_ids.includes(nodeId),
  )
  if (!mine.length) return null

  const errors = mine.filter((f) => f.severity === 'error')
  const worst = errors.length ? 'error' : 'warning'

  return (
    <div className="absolute -bottom-1.5 -left-1.5 z-10 group/findings">
      <div
        className={`rounded-full w-4 h-4 flex items-center justify-center shadow-sm border border-white cursor-help ${
          worst === 'error' ? 'bg-red-500' : 'bg-amber-400'
        }`}
      >
        <span className="text-white text-[9px] font-bold leading-none">
          {mine.length}
        </span>
      </div>
      <div className="hidden group-hover/findings:block absolute left-0 top-5 w-64 z-30">
        <div
          className={`rounded-lg shadow-lg border px-2.5 py-2 space-y-1.5 ${
            worst === 'error'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <p className="text-[10px] font-semibold text-gray-700">{title}</p>
          {mine.map((finding, i) => (
            <p
              key={i}
              className={`text-[10px] leading-snug ${
                finding.severity === 'error' ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              {finding.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}


/**
 * A node's name, renameable where you are looking at it.
 *
 * Renaming was only possible in the config panel, which means selecting the
 * node, finding the "Label & Description" field, and knowing it was there.
 * Double-clicking the thing you want to rename is what people already try.
 *
 * The title is load-bearing beyond decoration: validation messages, the hint
 * panel and the run log all name a node by it, so "Transform" three times over
 * is genuinely hard to read.
 */
function NodeTitle({ id, title }: { id: string; title: string }) {
  const updateNodeMetadata = useWorkflowStore((s) => s.updateNodeMetadata)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  const commit = () => {
    const next = draft.trim()
    if (next && next !== title) updateNodeMetadata(id, { title: next })
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        // `nodrag` keeps ReactFlow from starting a drag on the double-click.
        className="nodrag text-white text-xs font-semibold truncate flex-1 cursor-text"
        title="Double-click to rename"
        onDoubleClick={(e) => {
          e.stopPropagation()
          setDraft(title)
          setEditing(true)
        }}
      >
        {title}
      </span>
    )
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation()          // or Backspace would delete the node
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      className="nodrag flex-1 min-w-0 bg-white/95 text-gray-800 text-xs font-semibold px-1 py-0.5 rounded focus:outline-none focus:ring-2 focus:ring-white/70"
    />
  )
}


/**
 * The socket a tool hangs off, drawn the same way wherever it appears.
 *
 * It used to be written twice — once from `palette.tool_handles` in the generic
 * node and once hardcoded in the orchestrator's — with different sizes and
 * different offsets, so the same socket looked and behaved differently
 * depending on which node you were looking at. `tool_handles` now comes from
 * the backend, which is what lets both use this.
 */
function ToolHandles({ handles, color }: { handles: string[]; color: string }) {
  return (
    <>
      {handles.map((handle, i) => {
        const leftPct = handles.length === 1 ? 50 : 20 + (60 / (handles.length - 1)) * i
        return (
          <Handle
            key={`tool_${handle}`}
            type="target"
            position={Position.Bottom}
            id={handle}
            style={{
              background: '#ffffff',
              border: `2px solid ${color}`,
              left: `${leftPct}%`,
              bottom: -7,
              width: 12,
              height: 12,
            }}
            title={`${handle} — connect a tool, remote agent, function or tool group here`}
          />
        )
      })}
    </>
  )
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
  const palette = usePaletteMap()[nodeType]
  const nodeStatus = useWorkflowStore((s) => s.nodeStatus[id])
  const askWhatGoesHere = useWorkflowStore((s) => s.askWhatGoesHere)
  // Only a fork needs this, and it is selected as a joined string so the
  // comparison stays a primitive — subscribing every node to the edge array
  // would re-render the whole canvas on every edge change.
  const usedHandles = useWorkflowStore((s) =>
    (data as WorkflowNodeData).type === 'PARALLEL_FORK'
      ? s.edges.filter((e) => e.source === id)
          .map((e) => e.sourceHandle || 'output').join(',')
      : '',
  )

  // A node type the palette does not know about. Returning null here drew
  // nothing at all: the node occupied space, took no handles, and its edges
  // vanished — which reads as a broken canvas rather than a missing entry.
  // Say so instead.
  if (!palette) {
    return (
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-2 min-w-[150px]">
        <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
          Unknown node type
        </p>
        <p className="text-xs font-mono text-amber-900">{nodeType || '(none)'}</p>
        <p className="text-[10px] text-amber-600 mt-0.5">
          This build has no palette entry for it, so it cannot be wired.
        </p>
        <Handle type="target" position={Position.Left} id="input"
          style={{ background: '#f59e0b', border: '2px solid white' }} />
        <Handle type="source" position={Position.Right} id="output"
          style={{ background: '#f59e0b', border: '2px solid white' }} />
      </div>
    )
  }

  const title = (nodeData.metadata as { title?: string })?.title || palette.label
  const description = (nodeData.metadata as { description?: string })?.description
  const outputHandles = outputHandlesFor(
    nodeType,
    (nodeData.config || {}) as Record<string, unknown>,
    palette.output_handles,
    usedHandles ? usedHandles.split(',') : [],
  )
  // A fork or a condition has several right-hand handles that are only
  // distinguishable by name, so name them on the node rather than in a tooltip
  // nobody hovers over.
  const labelHandles = nodeType === 'PARALLEL_FORK' || nodeType === 'CONDITION'


  // Set by the canvas only while an edge is being dragged: true on the nodes
  // that could accept it. Showing the answer during the gesture is what stops
  // someone from having to learn the rules before they can draw anything.
  const dropTarget = (nodeData as { _dropTarget?: boolean })._dropTarget
  const dragState = dropTarget === undefined
    ? ''
    : dropTarget
    ? 'ring-2 ring-teal-400 ring-offset-1'
    : 'opacity-30'

  const borderColor = nodeStatus === 'running'
    ? 'border-blue-400 shadow-blue-200 animate-pulse'
    : nodeStatus === 'success'
    ? 'border-green-400 shadow-green-100'
    : nodeStatus === 'failed'
    ? 'border-red-400 shadow-red-100'
    : selected
    ? 'border-blue-400 shadow-blue-200'
    : 'border-transparent'

  return (
    <div
      className={`group/node rounded-xl shadow-lg border-2 transition-all relative ${borderColor} ${dragState} ${labelHandles ? 'min-w-[230px]' : 'min-w-[180px]'}`}
      style={{ background: '#fff' }}
    >
      {nodeStatus && <NodeStatusBadge status={nodeStatus} />}
      <NodeFindings nodeId={id} title={title} />

      <div className="flex items-center gap-2 px-3 py-2 rounded-t-xl" style={{ background: palette.color }}>
        <span className="flex-shrink-0">{getIcon(palette.icon)}</span>
        <NodeTitle id={id} title={title} />
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

      <ToolHandles handles={palette.tool_handles || []} color={palette.color} />

      {!palette.is_terminal && outputHandles.map((handle, i) => {
        const total = outputHandles.length
        const topPct = total === 1 ? 50 : 20 + (60 / (total - 1)) * i
        // The spare handle on a fork is not a branch yet — drawn hollow so it
        // reads as "drag another one from here" rather than as a wired branch.
        const spare = nodeType === 'PARALLEL_FORK' && i === total - 1
          && !usedHandles.split(',').includes(handle)
        return (
          <React.Fragment key={handle}>
            <Handle type="source" position={Position.Right} id={handle}
              style={{
                background: spare ? '#fff' : palette.color,
                border: `2px solid ${spare ? palette.color : '#fff'}`,
                top: `${topPct}%`,
              }}
              title={spare ? `${handle} — drag to add a branch` : handle} />
            {/* Drag-to-empty-canvas opens the same menu, but nobody discovers
                a gesture. This is the visible way in. */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                askWhatGoesHere(id, handle, e.clientX, e.clientY)
              }}
              title={`What can follow ${handle}?`}
              className="absolute w-3.5 h-3.5 rounded-full bg-white border border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity"
              style={{ right: -26, top: `${topPct}%`, transform: 'translateY(-50%)' }}
            >
              <Plus size={9} />
            </button>
            {labelHandles && (
              <span
                className="absolute text-[9px] font-mono pointer-events-none truncate max-w-[90px]"
                style={{
                  top: `${topPct}%`, right: 8,
                  transform: 'translateY(-50%)',
                  color: spare ? '#9ca3af' : palette.color,
                }}
              >
                {handle}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
})
WorkflowNode.displayName = 'WorkflowNode'

// ── Orchestrator Agent (specialized — shows connected tools live) ──────────────

/**
 * The outgoing handles a node actually has.
 *
 * CONDITION and PARALLEL_FORK name their own branches in config, so their
 * handles cannot be a fixed list. Reading the palette's instead meant any edge
 * leaving a custom-named branch had no handle to attach to and ReactFlow
 * simply did not draw it — a canvas that looked half-wired while compiling
 * perfectly. PARALLEL_FORK was worse: it declares no handles at all, so none
 * of its edges could ever be drawn.
 *
 * A fork also gets one spare handle below the ones in use, so another branch
 * can always be dragged out without opening the config panel first. Wiring it
 * names the branch (see `syncForkBranches` in the store), which grows the list
 * again — so the node keeps offering exactly one more than you have used.
 *
 * Falls back to the palette so a legacy CONDITION with no branches still shows
 * its true/false/default.
 */
function outputHandlesFor(
  nodeType: string,
  config: Record<string, unknown>,
  paletteHandles: string[],
  usedHandles: string[] = [],
): string[] {
  if (nodeType === 'CONDITION' || nodeType === 'PARALLEL_FORK') {
    // The two declare branches differently: CONDITION as {name, expression}
    // objects, PARALLEL_FORK as plain strings. Reading only the object form
    // left PARALLEL_FORK with no handles at all, so none of its edges drew.
    const branches = config.branches as Array<string | { name?: string }> | undefined
    const named = (branches || [])
      .map((b) => (typeof b === 'string' ? b : b?.name || '').trim())
      .filter(Boolean)

    if (nodeType === 'PARALLEL_FORK') {
      // An edge drawn from a handle the config has not caught up with yet
      // still needs somewhere to land.
      const all = [...named, ...usedHandles.filter((h) => h && !named.includes(h))]
      const spare = `branch_${all.length + 1}`
      return [...new Set([...all, spare])]
    }
    if (named.length) return [...new Set(named)]
  }
  return paletteHandles
}

const TOOL_PROVIDER_COLORS: Record<string, string> = {
  TOOL: '#3b82f6',
  DATASOURCE: '#0ea5e9',
  REMOTE_AGENT: '#6366f1',
  FUNCTION: '#8b5cf6',
  SEQUENTIAL_AGENT: '#0891b2',
  PARALLEL_AGENT: '#0d9488',
  LLM_AGENT: '#10b981',
}

const OrchestratorAgentNode = memo(({ data, id, selected }: NodeProps) => {
  const { nodes, edges } = useWorkflowStore((s) => ({ nodes: s.nodes, edges: s.edges }))
  const nodeStatus = useWorkflowStore((s) => s.nodeStatus[id])
  const nodeData = data as WorkflowNodeData
  const palette = usePaletteMap()['ORCHESTRATOR_AGENT']!
  const config = (nodeData.config || {}) as Record<string, unknown>

  const title = (nodeData.metadata as { title?: string })?.title || palette.label
  const framework = 'ADK'
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
        <NodeTitle id={id} title={title} />
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
            <div className="mb-1.5">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                Tools ({connectedTools.length})
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

      <ToolHandles handles={palette.tool_handles || []} color={palette.color} />

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

/**
 * The ReactFlow component for each node type.
 *
 * Driven by the type list rather than a literal: this used to be twenty
 * hardcoded strings, so a type the backend registered but nobody remembered to
 * add here rendered as the amber "Unknown node type" card. Pass the live
 * palette's types and that cannot happen.
 */
export const buildNodeTypes = (
  nodeTypes: string[] = [],
): Record<string, React.ComponentType<NodeProps>> => {
  const types: Record<string, React.ComponentType<NodeProps>> = {}
  for (const t of nodeTypes) {
    types[t] = WorkflowNode
  }
  // One type has a component of its own: it shows the tools wired into it.
  types['ORCHESTRATOR_AGENT'] = OrchestratorAgentNode
  return types
}
