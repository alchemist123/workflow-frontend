import React, { useEffect, useState } from 'react'
import { Plus, Play, Edit3, Trash2, Clock, CheckCircle, FileText } from 'lucide-react'
import { workflowApi } from '../api/client'
import type { Workflow } from '../types/workflow'

interface WorkflowListProps {
  onOpen: (wf: Workflow) => void
}

export default function WorkflowList({ onOpen }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const load = async () => {
    try {
      const data = await workflowApi.list()
      setWorkflows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const wf = await workflowApi.create(newName.trim())
    setWorkflows([wf, ...workflows])
    setNewName('')
    setCreating(false)
    onOpen(wf)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this workflow?')) return
    await workflowApi.delete(id)
    setWorkflows(workflows.filter((w) => w.id !== id))
  }

  const statusIcon = (status: Workflow['status']) => {
    if (status === 'active') return <CheckCircle size={14} className="text-green-500" />
    if (status === 'draft') return <FileText size={14} className="text-gray-400" />
    return <Clock size={14} className="text-gray-300" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">No-Code Platform</h1>
          <p className="text-xs text-gray-500 mt-0.5">A2A Workflow Builder</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={16} />
          New Workflow
        </button>
      </div>

      <div className="px-8 py-6">
        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4 mb-6 flex items-center gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
              placeholder="Workflow name..."
              className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm">Loading workflows…</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">⚡</div>
            <p className="text-gray-500 text-sm mb-4">No workflows yet. Create one to get started.</p>
            <button
              onClick={() => setCreating(true)}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => onOpen(wf)}
                className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(wf.status)}
                    <span className="text-[11px] text-gray-400 capitalize">{wf.status}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpen(wf) }}
                      className="p-1 text-gray-400 hover:text-blue-500 rounded"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(wf.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1 truncate">{wf.name}</h3>
                {wf.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">{wf.description}</p>
                )}
                <p className="text-[10px] text-gray-300 mt-auto">
                  {new Date(wf.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
