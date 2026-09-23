import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type OnConnectStartParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '../../store/workflowStore'
import { buildNodeTypes } from '../../nodes/NodeComponents'
import { usePaletteList, usePaletteMap } from '../../nodes/index'
import { judgeConnection } from '../../nodes/connections'
import ValidatedEdge from './ValidatedEdge'
import SuggestionMenu, { type SuggestionSource } from './SuggestionMenu'
import HintPanel from './HintPanel'

const edgeTypes = { validated: ValidatedEdge }

/** Roughly half a node, so a suggested node lands under the cursor. */
const NODE_OFFSET = { x: 90, y: 30 }

function Canvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNode, rules, loadRules, revalidate,
    suggestFrom, clearSuggestion,
  } = useWorkflowStore()

  const paletteList = usePaletteList()
  const paletteByType = usePaletteMap()
  // Rebuilt only when the palette itself changes -- once, when the backend
  // answers. ReactFlow complains if `nodeTypes` is a fresh object every render.
  const nodeTypes = useMemo(
    () => buildNodeTypes(paletteList.map((n) => n.type)),
    [paletteList],
  )
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const flow = useReactFlow()

  // The handle a drag started from, so the canvas can say what will accept it.
  const [dragging, setDragging] = useState<OnConnectStartParams | null>(null)
  const [suggesting, setSuggesting] = useState<SuggestionSource | null>(null)

  useEffect(() => {
    loadRules()
    // Mark whatever is already wrong on a canvas that was just opened, rather
    // than waiting for the first edit.
    revalidate()
  }, [loadRules, revalidate])

  /**
   * The `+` on a handle asks the same question as dropping an edge on empty
   * canvas, so it opens the same menu. The new node goes to the right of the
   * one it came from rather than under the cursor, which is where the `+` is.
   */
  useEffect(() => {
    if (!suggestFrom) return
    const from = nodes.find((n) => n.id === suggestFrom.nodeId)
    if (!from) {
      clearSuggestion()
      return
    }
    setSuggesting({
      nodeId: suggestFrom.nodeId,
      nodeType: (from.data as { type?: string })?.type || from.type || '',
      handle: suggestFrom.handle,
      config: (from.data as { config?: Record<string, unknown> })?.config,
      position: { x: from.position.x + 260, y: from.position.y },
      screen: { x: suggestFrom.x + 12, y: suggestFrom.y },
    })
    clearSuggestion()
  }, [suggestFrom, nodes, clearSuggestion])

  /** Flow coordinates for a pointer position, honouring pan and zoom. */
  const toFlow = useCallback(
    (clientX: number, clientY: number) => {
      const at = flow.screenToFlowPosition({ x: clientX, y: clientY })
      return { x: at.x - NODE_OFFSET.x, y: at.y - NODE_OFFSET.y }
    },
    [flow],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow-node-type')
      if (!nodeType) return
      // `screenToFlowPosition`, not the wrapper's bounding rect: the old
      // arithmetic ignored pan and zoom, so a node dropped on a scrolled canvas
      // landed somewhere else entirely.
      addNode(nodeType, toFlow(e.clientX, e.clientY))
    },
    [addNode, toFlow],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => setSelectedNode(node.id),
    [setSelectedNode],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSuggesting(null)
  }, [setSelectedNode])

  // ── Guidance while dragging ────────────────────────────────────────────────

  const onConnectStart = useCallback(
    (_: unknown, params: OnConnectStartParams) => {
      setSuggesting(null)
      setDragging(params)
    },
    [],
  )

  /**
   * Dropping on empty canvas asks what should go there, rather than quietly
   * doing nothing — which is what it did before, and gave no clue that the
   * gesture had been understood at all.
   */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const params = dragging
      setDragging(null)
      if (!params?.nodeId) return

      const target = event.target as HTMLElement | null
      if (!target?.classList?.contains('react-flow__pane')) return

      const point = 'changedTouches' in event ? event.changedTouches[0] : event
      const from = nodes.find((n) => n.id === params.nodeId)
      if (!from) return

      setSuggesting({
        nodeId: params.nodeId,
        nodeType: (from.data as { type?: string })?.type || from.type || '',
        handle: params.handleId || 'output',
        config: (from.data as { config?: Record<string, unknown> })?.config,
        position: toFlow(point.clientX, point.clientY),
        screen: { x: point.clientX, y: point.clientY },
      })
    },
    [dragging, nodes, toFlow],
  )

  /** Create the chosen node where the edge was dropped, and wire it up. */
  const acceptSuggestion = useCallback(
    (nodeType: string, targetHandle: string) => {
      if (!suggesting) return
      const created = addNode(nodeType, suggesting.position)
      if (created) {
        onConnect({
          source: suggesting.nodeId,
          sourceHandle: suggesting.handle,
          target: created,
          targetHandle,
        })
        setSelectedNode(created)
      }
      setSuggesting(null)
    },
    [suggesting, addNode, onConnect, setSelectedNode],
  )

  /**
   * Which nodes can accept what is being dragged.
   *
   * Passed down as node data so a node can dim itself; computing it here means
   * one lookup per drag rather than one per node per render.
   */
  const dropTargets = useMemo(() => {
    if (!dragging?.nodeId || !rules) return null
    const from = nodes.find((n) => n.id === dragging.nodeId)
    if (!from) return null
    const fromType = (from.data as { type?: string })?.type || from.type || ''
    const config = (from.data as { config?: Record<string, unknown> })?.config

    const accepting = new Set<string>()
    for (const node of nodes) {
      if (node.id === dragging.nodeId) continue
      const toType = (node.data as { type?: string })?.type || node.type || ''
      const ok = ['input', 'tools'].some(
        (handle) =>
          judgeConnection(rules, fromType, dragging.handleId, toType, handle, config) === null,
      )
      if (ok) accepting.add(node.id)
    }
    return accepting
  }, [dragging, nodes, rules])

  const shownNodes = useMemo(() => {
    if (!dropTargets) return nodes
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, _dropTarget: dropTargets.has(n.id) },
    }))
  }, [nodes, dropTargets])

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative">
      <ReactFlow
        nodes={shownNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'validated',
          style: { strokeWidth: 2, stroke: '#94a3b8' },
          markerEnd: { type: 'arrowclosed' as never, color: '#94a3b8' },
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        // Backspace as well as Delete: a Mac laptop keyboard has no Delete key,
        // so a node could not be removed by keyboard at all.
        deleteKeyCode={['Delete', 'Backspace']}
        connectionLineStyle={{ strokeWidth: 2, stroke: '#6366f1' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls className="border border-gray-200 rounded-xl overflow-hidden shadow-sm" />
        <MiniMap
          nodeColor={(n) => {
            const palette = paletteByType[n.type || '']
            return palette?.color || '#94a3b8'
          }}
          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>

      <HintPanel />

      {suggesting && (
        <SuggestionMenu
          source={suggesting}
          rules={rules}
          onPick={acceptSuggestion}
          onClose={() => setSuggesting(null)}
        />
      )}
    </div>
  )
}

/**
 * `useReactFlow` — which is what gives honest drop coordinates under pan and
 * zoom — only works inside a provider, and the app has never had one. Wrapping
 * here rather than in App.tsx keeps it next to its only user.
 */
export default function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
