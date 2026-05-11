import React, { useState } from 'react'
import * as Icons from 'lucide-react'
import { STATIC_PALETTE, CATEGORY_COLORS, type StaticPaletteNode } from '../../nodes/index'

interface NodePaletteProps {
  onDragStart: (e: React.DragEvent, nodeType: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  triggers: 'Triggers',
  ai: 'AI / Agents',
  flow: 'Flow Control',
  data: 'Data',
}

function getIcon(iconName: string, size = 16): React.ReactNode {
  const LucideIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[iconName]
  return LucideIcon ? <LucideIcon size={size} /> : null
}

function PaletteItem({ node, onDragStart }: { node: StaticPaletteNode; onDragStart: NodePaletteProps['onDragStart'] }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.type)}
      className="flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
    >
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: node.color }}
      >
        {getIcon(node.icon, 14)}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-gray-800 leading-tight truncate">{node.label}</div>
        <div className="text-[10px] text-gray-400 leading-tight truncate">{node.description}</div>
      </div>
    </div>
  )
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState('')
  const [wave, setWave] = useState<1 | 2 | 'all'>('all')

  const filtered = STATIC_PALETTE.filter((n) => {
    const matchesSearch = n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
    const matchesWave = wave === 'all' || n.wave === wave
    return matchesSearch && matchesWave
  })

  const grouped: Record<string, StaticPaletteNode[]> = {}
  for (const node of filtered) {
    grouped[node.category] = grouped[node.category] || []
    grouped[node.category].push(node)
  }

  return (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Node Palette</h2>
        <input
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <div className="flex gap-1 mt-2">
          {(['all', 1, 2] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWave(w)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                wave === w
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {w === 'all' ? 'All' : `Wave ${w}`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
          const nodes = grouped[cat]
          if (!nodes?.length) return null
          return (
            <div key={cat}>
              <div
                className="text-[10px] font-bold uppercase tracking-wider px-1 mb-1"
                style={{ color: CATEGORY_COLORS[cat] }}
              >
                {label}
              </div>
              <div className="space-y-0.5">
                {nodes.map((n) => (
                  <PaletteItem key={n.type} node={n} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
