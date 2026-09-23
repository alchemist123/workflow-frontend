/**
 * What this workflow still needs, in the order someone would fix it.
 *
 * The compile errors were only ever a flat list in a Toolbar dropdown, opened
 * after a failed save. This is the same information, live, phrased around the
 * node you would click — and clicking an entry selects and centres that node,
 * which is the part the dropdown could never do because the messages named
 * node ids rather than carrying them.
 *
 * Graph-level problems are the ones that belong here rather than on a node:
 * "there is no End node", "these branches never rejoin". A node cannot draw
 * attention to a node that is missing.
 */

import { useMemo, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import type { Finding } from '../../api/client'

export default function HintPanel() {
  const [open, setOpen] = useState(true)
  const findings = useWorkflowStore((s) => s.findings)
  const nodes = useWorkflowStore((s) => s.nodes)
  const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode)
  const flow = useReactFlow()

  /** A node's own title, so an entry names what is on screen rather than an id. */
  const titleOf = useMemo(() => {
    const titles = new Map<string, string>()
    for (const node of nodes) {
      const meta = node.data.metadata as { title?: string } | undefined
      titles.set(node.id, meta?.title || (node.type || '').replace(/_/g, ' '))
    }
    return titles
  }, [nodes])

  const errors = findings.filter((f) => f.severity === 'error')
  const warnings = findings.filter((f) => f.severity === 'warning')

  const focus = (finding: Finding) => {
    const target = finding.node_id || finding.related_node_ids[0]
    if (!target) return
    setSelectedNode(target)
    flow.fitView({ nodes: [{ id: target }], duration: 300, maxZoom: 1.2, padding: 0.4 })
  }

  if (nodes.length === 0) return null

  if (!errors.length && !warnings.length) {
    return (
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full shadow-md border border-green-200 px-3 py-1.5">
        <CheckCircle2 size={12} className="text-green-500" />
        <span className="text-[11px] text-green-700">Ready to run</span>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 w-72 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
      >
        {errors.length ? (
          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
        ) : (
          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
        )}
        <span className="text-[11px] font-semibold text-gray-700 flex-1 text-left">
          {errors.length
            ? `${errors.length} thing${errors.length === 1 ? '' : 's'} to fix`
            : `${warnings.length} thing${warnings.length === 1 ? '' : 's'} worth checking`}
        </span>
        {open ? (
          <ChevronDown size={12} className="text-gray-400" />
        ) : (
          <ChevronUp size={12} className="text-gray-400" />
        )}
      </button>

      {open && (
        <ul className="max-h-60 overflow-y-auto border-t border-gray-100 divide-y divide-gray-50">
          {[...errors, ...warnings].map((finding, i) => {
            const target = finding.node_id || finding.related_node_ids[0]
            const title = target ? titleOf.get(target) : null
            return (
              <li key={i}>
                <button
                  onClick={() => focus(finding)}
                  disabled={!target}
                  className={`w-full text-left px-3 py-2 ${
                    target ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {title && (
                    <span className="block text-[10px] font-semibold text-gray-600">
                      {title}
                    </span>
                  )}
                  <span
                    className={`block text-[10px] leading-snug ${
                      finding.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {finding.message}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
