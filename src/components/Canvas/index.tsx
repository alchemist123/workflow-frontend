import React, { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '../../store/workflowStore'
import { buildNodeTypes } from '../../nodes/NodeComponents'
import { PALETTE_BY_TYPE } from '../../nodes/index'

const nodeTypes = buildNodeTypes()

export default function WorkflowCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setSelectedNode,
  } = useWorkflowStore()

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = React.useState<ReturnType<typeof import('@xyflow/react').useReactFlow> | null>(null)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow-node-type')
      if (!nodeType || !reactFlowWrapper.current) return

      const rect = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: e.clientX - rect.left - 90,
        y: e.clientY - rect.top - 30,
      }
      addNode(nodeType, position)
    },
    [addNode],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => setRfInstance(instance as never)}
        fitView
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          style: { strokeWidth: 2, stroke: '#94a3b8' },
          markerEnd: { type: 'arrowclosed' as never, color: '#94a3b8' },
        }}
        connectionLineStyle={{ strokeWidth: 2, stroke: '#6366f1' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls className="border border-gray-200 rounded-xl overflow-hidden shadow-sm" />
        <MiniMap
          nodeColor={(n) => {
            const palette = PALETTE_BY_TYPE[n.type || '']
            return palette?.color || '#94a3b8'
          }}
          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          maskColor="rgba(241, 245, 249, 0.7)"
        />
      </ReactFlow>
    </div>
  )
}
