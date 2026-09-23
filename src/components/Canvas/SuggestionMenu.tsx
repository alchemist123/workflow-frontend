/**
 * "What can go here?" — the menu shown when an edge is dropped on empty canvas.
 *
 * The list is the answer to `targetsFor`, which the backend computed by asking
 * the compiler's own rule for every combination. So it can only ever offer
 * something that will connect cleanly: the menu and the compiler cannot
 * disagree.
 *
 * Ordering matters more than it looks. Twenty legal choices in alphabetical
 * order is a wall of names to someone who does not yet know what any of them
 * do; the same twenty with the three that are nearly always right at the top
 * is a suggestion. `COMMON_NEXT` is that prior, read off what the shipped
 * example workflows actually wire rather than invented.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { Search } from 'lucide-react'
import type { ConnectionRules } from '../../api/client'
import { usePaletteMap, type PaletteEntry } from '../../nodes/index'
import { TOOLS_HANDLE, label, targetsFor } from '../../nodes/connections'

/**
 * What usually follows what, counted across the 13 seed workflows in
 * `test-agents/workflows/`. Only a ranking hint — anything legal is still
 * offered, just further down.
 */
const COMMON_NEXT: Record<string, string[]> = {
  A2A_START: ['TRANSFORM', 'ORCHESTRATOR_AGENT', 'CONDITION', 'PARALLEL_FORK'],
  TRANSFORM: ['END', 'TRANSFORM', 'MERGE', 'CONDITION', 'MCP_TOOL'],
  CONDITION: ['TRANSFORM', 'HUMAN_APPROVAL', 'END'],
  ORCHESTRATOR_AGENT: ['END', 'TRANSFORM'],
  PARALLEL_FORK: ['WAIT', 'TRANSFORM'],
  WAIT: ['TRANSFORM', 'MERGE'],
  MERGE: ['TRANSFORM', 'END'],
  HUMAN_APPROVAL: ['TRANSFORM', 'HUMAN_INPUT', 'END'],
  HUMAN_INPUT: ['TRANSFORM'],
  MCP_TOOL: ['TRANSFORM', 'END'],
  LOOP: ['TRANSFORM', 'END'],
}

/** Tools are offered for a tools socket; these lead that list. */
const COMMON_TOOLS = ['TOOL', 'MCP_TOOL', 'REMOTE_AGENT', 'FUNCTION', 'LLM_AGENT']

export interface SuggestionSource {
  nodeId: string
  nodeType: string
  handle: string
  config?: Record<string, unknown>
  /** Where the edge was dropped, in flow coordinates. */
  position: { x: number; y: number }
  /** Where to draw the menu, in screen coordinates. */
  screen: { x: number; y: number }
}

interface Props {
  source: SuggestionSource
  rules: ConnectionRules | null
  onPick: (nodeType: string, targetHandle: string) => void
  onClose: () => void
}

function icon(palette: PaletteEntry | undefined) {
  const Lucide = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[
    palette?.icon || ''
  ]
  return Lucide ? <Lucide size={13} color={palette?.color || '#64748b'} /> : null
}

export default function SuggestionMenu({ source, rules, onPick, onClose }: Props) {
  const paletteByType = usePaletteMap()
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)

  const choices = useMemo(() => {
    const offered = targetsFor(rules, source.nodeType, source.handle, source.config)
    const entries = Object.entries(offered).map(([nodeType, handles]) => ({
      nodeType,
      // A node that can take it either way takes it as flow: that is what
      // dragging out of an output handle means.
      handle: handles.includes(TOOLS_HANDLE) && handles.length === 1
        ? TOOLS_HANDLE
        : handles[0],
    }))

    const isToolDrag = entries.every((e) => e.handle === TOOLS_HANDLE)
    const prior = isToolDrag ? COMMON_TOOLS : COMMON_NEXT[source.nodeType] || []
    const rank = (nodeType: string) => {
      const at = prior.indexOf(nodeType)
      return at === -1 ? prior.length + 1 : at
    }

    return entries
      .filter(({ nodeType }) => {
        if (!query.trim()) return true
        const palette = paletteByType[nodeType]
        return `${palette?.label || label(nodeType)} ${nodeType}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      })
      .sort(
        (a, b) =>
          rank(a.nodeType) - rank(b.nodeType) ||
          (paletteByType[a.nodeType]?.label || a.nodeType).localeCompare(
            paletteByType[b.nodeType]?.label || b.nodeType,
          ),
      )
  }, [rules, source.nodeType, source.handle, source.config, query, paletteByType])

  // Close on Escape or a click elsewhere — a menu you cannot dismiss is worse
  // than no menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as globalThis.Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    // Deferred: the mouseup that opened this menu would otherwise close it.
    const timer = window.setTimeout(() => window.addEventListener('mousedown', onDown), 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
      window.clearTimeout(timer)
    }
  }, [onClose])

  const leadingCount = source.handle === TOOLS_HANDLE ? 0 : (COMMON_NEXT[source.nodeType] || []).length

  return (
    <div
      ref={box}
      className="fixed z-50 w-60 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      style={{ left: source.screen.x, top: source.screen.y }}
    >
      <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-700">
          Connect {label(source.nodeType)} to…
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {choices.length === 0
            ? 'Nothing can follow this node.'
            : 'Only what can legally go here is listed.'}
        </p>
      </div>

      {choices.length > 6 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-100">
          <Search size={11} className="text-gray-300 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 min-w-0 text-[11px] focus:outline-none placeholder:text-gray-300"
          />
        </div>
      )}

      <ul className="max-h-72 overflow-y-auto py-1">
        {choices.map(({ nodeType, handle }, index) => {
          const palette = paletteByType[nodeType]
          return (
            <li key={nodeType}>
              {index === leadingCount && leadingCount > 0 && (
                <div className="border-t border-gray-100 my-1" />
              )}
              <button
                onClick={() => onPick(nodeType, handle)}
                className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-slate-50 text-left"
              >
                <span className="mt-0.5 flex-shrink-0">{icon(palette)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-gray-800 truncate">
                    {palette?.label || label(nodeType)}
                    {handle === TOOLS_HANDLE && (
                      <span className="text-[9px] text-blue-500"> · as a tool</span>
                    )}
                  </span>
                  {palette?.description && (
                    <span className="block text-[10px] text-gray-400 truncate">
                      {palette.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
        {choices.length === 0 && (
          <li className="px-3 py-3 text-[10px] text-gray-400">
            {query.trim() ? 'Nothing matches.' : 'Try dragging from a different socket.'}
          </li>
        )}
      </ul>
    </div>
  )
}
