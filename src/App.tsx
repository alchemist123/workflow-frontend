import React, { useState, useCallback } from 'react'
import WorkflowList from './components/WorkflowList'
import WorkflowCanvas from './components/Canvas/index'
import NodePalette from './components/NodePalette/index'
import NodeConfigPanel from './components/NodeConfigPanel/index'
import Toolbar from './components/Toolbar/index'
import { useWorkflowStore } from './store/workflowStore'
import type { Workflow } from './types/workflow'
import { workflowApi } from './api/client'

type View = 'list' | 'editor'

export default function App() {
  const [view, setView] = useState<View>('list')
  const { setCurrentWorkflow, selectedNodeId, loadCanvas, clearCanvas } = useWorkflowStore()

  const handleOpenWorkflow = useCallback(async (wf: Workflow) => {
    clearCanvas()           // always start fresh — prevents stale canvas from previous workflow
    setCurrentWorkflow(wf)
    try {
      const versions = await workflowApi.listVersions(wf.id)
      if (versions.length > 0) loadCanvas(versions[0])
    } catch { /* new workflow — blank canvas is correct */ }
    setView('editor')
  }, [setCurrentWorkflow, loadCanvas, clearCanvas])

  const handleBack = useCallback(() => {
    setView('list')
  }, [])

  const onDragStart = useCallback((e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow-node-type', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  if (view === 'list') {
    return <WorkflowList onOpen={handleOpenWorkflow} />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <Toolbar onBack={handleBack} />
      <div className="flex flex-1 overflow-hidden">
        <NodePalette onDragStart={onDragStart} />
        <WorkflowCanvas />
        {selectedNodeId && <NodeConfigPanel />}
      </div>
    </div>
  )
}
