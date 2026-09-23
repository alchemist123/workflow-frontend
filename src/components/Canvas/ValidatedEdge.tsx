/**
 * A connection you can remove, that says so when it is wrong.
 *
 * Hovering anywhere along it reveals an × that deletes it. There was no
 * visible way to remove a connection before: an edge could be selected and
 * deleted with the keyboard, but nothing on screen said so, and the line is
 * 2px wide — so the hit area here is a transparent 18px stroke, not the line.
 *
 * No confirmation. Removing one line is trivially redrawn, and a dialog for it
 * would be in the way every time.
 *
 * Wiring a tool into the flow used to draw an ordinary grey line, and the
 * mistake only surfaced at Save & Compile as prose naming a node id. Here the
 * edge turns red the moment it is drawn and explains itself on hover, which is
 * the difference between finding out now and finding out later.
 *
 * It marks rather than refuses, deliberately: a rough draft can be wired
 * loosely and tidied up, and a canvas that *blocks* a connection the compiler
 * would have accepted stops real work with no way around it. Save & Compile
 * still refuses, so nothing broken can actually run.
 */

import { useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  useStore,
  type EdgeProps,
} from '@xyflow/react'
import { AlertTriangle, X } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import { judgeConnection } from '../../nodes/connections'

export default function ValidatedEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const rules = useWorkflowStore((s) => s.rules)
  const flow = useReactFlow()

  // Read the two endpoints out of ReactFlow's own store rather than the app
  // store, so the verdict follows a node whose config changed without waiting
  // for anything else to re-render.
  //
  // The selector returns a **string**, not the Refusal object. zustand compares
  // selector results with `Object.is`, so returning a freshly built object
  // every render would never compare equal and would re-render forever.
  const reason = useStore((flow) => {
    const edge = flow.edges.find((e) => e.id === id)
    const from = flow.nodeLookup.get(source)
    const to = flow.nodeLookup.get(target)
    if (!edge || !from || !to) return ''
    const refusal = judgeConnection(
      rules,
      (from.data as { type?: string })?.type || from.type || '',
      edge.sourceHandle,
      (to.data as { type?: string })?.type || to.type || '',
      edge.targetHandle,
      (from.data as { config?: Record<string, unknown> })?.config,
    )
    return refusal?.message || ''
  })

  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  })

  const remove = () => flow.deleteElements({ edges: [{ id }] })

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={
          reason
            ? { ...style, stroke: '#ef4444', strokeWidth: 2.5, strokeDasharray: '6 3' }
            : style
        }
      />

      {/* A wide invisible stroke, because a 2px line is nearly impossible to
          hover deliberately — and hovering is how the delete control appears. */}
      <path
        d={path}
        fill="none"
        strokeWidth={18}
        stroke="transparent"
        style={{ pointerEvents: 'stroke' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          className="absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            zIndex: hovered ? 20 : 5,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {hovered ? (
            <div className="flex flex-col items-center gap-1">
              {/* Deleting a connection had no visible control at all: you had
                  to know an edge could be selected and that Delete removed it.
                  Discoverable beats memorable. */}
              <button
                onClick={remove}
                title="Remove this connection"
                className="w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-400 shadow-sm flex items-center justify-center hover:bg-red-50 hover:border-red-400 hover:text-red-500"
              >
                <X size={11} />
              </button>
              {reason && (
                <div className="w-56 bg-red-50 border border-red-200 rounded-lg shadow-lg px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-red-600 mb-0.5">
                    This connection will not compile
                  </p>
                  <p className="text-[10px] text-red-700 leading-snug">{reason}</p>
                </div>
              )}
            </div>
          ) : reason ? (
            <div className="bg-red-500 rounded-full p-0.5 shadow-sm border border-white pointer-events-none">
              <AlertTriangle size={9} className="text-white" />
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
