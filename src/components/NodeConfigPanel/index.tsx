import React, { useState, useEffect, useMemo } from 'react'
import { X, Trash2, ChevronDown, ChevronUp, Plus, Minus, PlugZap, Loader2 } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import { PALETTE_BY_TYPE } from '../../nodes/index'
import { workflowApi, mcpApi, type NodeInput, type McpTool } from '../../api/client'

export default function NodeConfigPanel() {
  const { nodes, selectedNodeId, setSelectedNode, updateNodeConfig, updateNodeMetadata, deleteNode } =
    useWorkflowStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [schemaOpen, setSchemaOpen] = useState(false)

  useEffect(() => {
    if (selectedNode) {
      setTitle((selectedNode.data.metadata as { title?: string })?.title || '')
      setDescription((selectedNode.data.metadata as { description?: string })?.description || '')
    }
  }, [selectedNodeId])

  if (!selectedNode) return null

  const palette = PALETTE_BY_TYPE[selectedNode.type!]
  const nodeType = selectedNode.type!
  const cfg = (selectedNode.data.config || {}) as Record<string, unknown>
  const save = (c: Record<string, unknown>) => updateNodeConfig(selectedNode.id, c)

  const metaSave = () => updateNodeMetadata(selectedNode.id, { title, description })

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2.5 flex-shrink-0"
        style={{ background: palette?.color || '#64748b' }}
      >
        <span className="text-white text-sm font-semibold truncate">
          {title || palette?.label || nodeType}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => deleteNode(selectedNode.id)} className="text-white/70 hover:text-white p-1 rounded">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setSelectedNode(null)} className="text-white/70 hover:text-white p-1 rounded">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ── Metadata ── */}
        <section>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Label &amp; Description</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} onBlur={metaSave}
            placeholder="Node title"
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 mb-1.5"
          />
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)} onBlur={metaSave}
            placeholder="Description (optional)" rows={2}
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
        </section>

        {/* ── Per-node config forms ── */}
        {nodeType === 'A2A_START'         && <A2aStartForm         cfg={cfg} save={save} />}
        {nodeType === 'TRANSFORM'            && <TransformForm           cfg={cfg} save={save} nodeId={selectedNode.id} />}
        {nodeType === 'CONDITION'            && <ConditionForm           cfg={cfg} save={save} />}
        {nodeType === 'LOOP'                 && <LoopForm                cfg={cfg} save={save} />}
        {nodeType === 'WAIT'                 && <WaitForm                cfg={cfg} save={save} />}
        {nodeType === 'END'                  && <EndForm                 cfg={cfg} save={save} />}
        {nodeType === 'LLM_AGENT'            && <LlmAgentForm            cfg={cfg} save={save} nodeId={selectedNode.id} />}
        {nodeType === 'ORCHESTRATOR_AGENT'   && <OrchestratorAgentForm   cfg={cfg} save={save} />}
        {nodeType === 'REMOTE_AGENT'         && <RemoteAgentForm         cfg={cfg} save={save} />}
        {nodeType === 'FUNCTION'             && <FunctionForm            cfg={cfg} save={save} />}
        {nodeType === 'AGENT'                && <AgentForm               cfg={cfg} save={save} />}
        {nodeType === 'TOOL'                 && <McpForm label="Tool"        cfg={cfg} save={save} />}
        {nodeType === 'DATASOURCE'           && <McpForm label="Data Source" cfg={cfg} save={save} />}
        {nodeType === 'HUMAN_APPROVAL'    && <HumanApprovalForm    cfg={cfg} save={save} />}
        {nodeType === 'HUMAN_INPUT'       && <HumanInputForm       cfg={cfg} save={save} />}
        {nodeType === 'SUBWORKFLOW'       && <SubworkflowForm      cfg={cfg} save={save} />}
        {nodeType === 'MCP_TOOL'          && <McpToolForm          cfg={cfg} save={save} nodeId={selectedNode.id} />}
        {nodeType === 'PARALLEL_FORK'     && <ParallelForkForm     cfg={cfg} save={save} nodeId={selectedNode.id} />}
        {nodeType === 'MERGE'             && <MergeForm            cfg={cfg} save={save} />}
        {nodeType === 'SEQUENTIAL_AGENT'  && <ToolGroupForm mode="sequential" nodeId={selectedNode.id} cfg={cfg} save={save} />}
        {nodeType === 'PARALLEL_AGENT'    && <ToolGroupForm mode="parallel"   nodeId={selectedNode.id} cfg={cfg} save={save} />}

        {/* ── Variable (every node that produces a result) ── */}
        <VariableField nodeType={nodeType} cfg={cfg} save={save} />

        {/* ── Schema reference ── */}
        {palette?.config_schema && (
          <section>
            <button
              onClick={() => setSchemaOpen(!schemaOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
            >
              Schema Reference
              {schemaOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {schemaOpen && (
              <pre className="mt-2 text-[10px] bg-gray-50 border border-gray-200 rounded-md p-2 overflow-auto max-h-40 text-gray-600">
                {JSON.stringify(palette.config_schema, null, 2)}
              </pre>
            )}
          </section>
        )}

        {/* ── Node info footer ── */}
        <section className="text-[10px] text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
          <div>ID: <span className="font-mono">{selectedNode.id}</span></div>
          <div>Type: <span className="font-medium">{nodeType}</span></div>
          <div>Handles: {palette?.output_handles?.join(', ') || '—'}</div>
        </section>
      </div>
    </div>
  )
}

/* ─── Shared helpers ───────────────────────────────────────────────────────── */

type FormProps = { cfg: Record<string, unknown>; save: (c: Record<string, unknown>) => void }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, mono = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 ${mono ? 'font-mono' : ''}`}
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4, mono = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 ${mono ? 'font-mono' : ''}`}
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{children}</label>
}

function NumberInput({ value, onChange, min, max }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <input
      type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  )
}

/* ─── Tool groups (Sequential / Parallel) ──────────────────────────────────── */

function ToolGroupForm({
  mode,
  nodeId,
  cfg,
  save,
}: FormProps & { mode: 'sequential' | 'parallel'; nodeId: string }) {
  const { nodes, edges } = useWorkflowStore()
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })

  // The tools wired into this group's own tools handle, in canvas order.
  const children = edges
    .filter((e) => e.target === nodeId && e.targetHandle === 'tools')
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))

  const label = (id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return id
    const title = (node.data?.metadata as { title?: string } | undefined)?.title
    return title?.trim() || node.type || id
  }

  // The saved order, dropping anything no longer connected, then appending
  // whatever is connected but unordered — matching how the compiler resolves it.
  const saved = ((cfg.order as string[]) || []).filter((id) =>
    children.some((c) => c.id === id),
  )
  const order = [...saved, ...children.map((c) => c.id).filter((id) => !saved.includes(id))]

  const move = (index: number, delta: number) => {
    const next = [...order]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    s('order', next)
  }

  return (
    <section className="space-y-3">
      <SectionLabel>{mode === 'sequential' ? 'Sequential Tools' : 'Parallel Tools'}</SectionLabel>
      <p className="text-[10px] text-gray-400 -mt-1.5">
        {mode === 'sequential'
          ? 'Connect tools below, then connect this node to an agent. The agent sees one tool that runs them in order, each one\u2019s output feeding the next.'
          : 'Connect tools below, then connect this node to an agent. The agent sees one tool that runs them all at once on the same input.'}
      </p>

      <Field label="Tool name (what the model sees)">
        <TextInput
          value={String(cfg.name || '')}
          onChange={(v) => s('name', v)}
          placeholder={mode === 'sequential' ? 'fetch_then_summarise' : 'compare_sources'}
          mono
        />
      </Field>

      <Field label="Description (helps the model choose it)">
        <TextArea
          value={String(cfg.description || '')}
          onChange={(v) => s('description', v)}
          placeholder="Left blank, a description is generated listing the tools."
          rows={2}
        />
      </Field>

      {mode === 'parallel' && (
        <Field label="Max at once (0 = no limit)">
          <NumberInput
            value={Number(cfg.max_concurrency ?? 0)}
            onChange={(v) => s('max_concurrency', v)}
            min={0}
            max={50}
          />
        </Field>
      )}

      <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(cfg.stop_on_error ?? (mode === 'sequential'))}
          onChange={(e) => s('stop_on_error', e.target.checked)}
          className="w-3 h-3 mt-0.5"
        />
        <span>
          Stop on first error
          <span className="block text-[10px] text-gray-400">
            {mode === 'sequential'
              ? 'Off: keep going and report which steps failed.'
              : 'Off (default): one dead tool does not lose the others.'}
          </span>
        </span>
      </label>

      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          {mode === 'sequential' ? 'Execution order' : 'Connected tools'}
        </p>
        {children.length === 0 && (
          <p className="text-[10px] text-red-400">
            Nothing connected. Wire a tool, remote agent, function or another
            group into the dot at the bottom of this node.
          </p>
        )}
        {children.length === 1 && (
          <p className="text-[10px] text-amber-500 mb-1">
            Only one tool connected — this behaves the same as connecting it
            straight to the agent.
          </p>
        )}
        {order.map((id, i) => (
          <div
            key={id}
            className="flex items-center gap-1 mb-1 p-1.5 bg-cyan-50 border border-cyan-100 rounded-md"
          >
            {mode === 'sequential' && (
              <span className="text-[10px] font-mono text-cyan-600 w-4 flex-shrink-0">{i + 1}</span>
            )}
            <span className="flex-1 text-[11px] text-gray-700 truncate">{label(id)}</span>
            {mode === 'sequential' && order.length > 1 && (
              <>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title="Move earlier"
                  className="text-cyan-500 hover:text-cyan-700 disabled:opacity-25"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  title="Move later"
                  className="text-cyan-500 hover:text-cyan-700 disabled:opacity-25"
                >
                  <ChevronDown size={12} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── A2A Start ────────────────────────────────────────────────────────────── */

type PayloadField = { name: string; type: string; description: string; required: boolean }

const PAYLOAD_FIELD_TYPES = ['string', 'text', 'number', 'integer', 'boolean', 'object', 'array']

function A2aStartForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const fields: PayloadField[] = ((cfg.payload_schema as { fields?: PayloadField[] })?.fields) || []
  const inputMode = String(cfg.input_mode || 'json')

  const saveFields = (f: PayloadField[]) => s('payload_schema', { fields: f })
  const addField = () => saveFields([...fields, { name: '', type: 'string', description: '', required: false }])
  const removeField = (i: number) => saveFields(fields.filter((_, j) => j !== i))
  const setField = (i: number, k: keyof PayloadField, v: string | boolean) =>
    saveFields(fields.map((f, j) => j === i ? { ...f, [k]: v } : f))

  const names = fields.map((f) => f.name.trim())
  const duplicates = new Set(names.filter((n, i) => n && names.indexOf(n) !== i))

  return (
    <section className="space-y-3">
      <SectionLabel>A2A Start</SectionLabel>
      <p className="text-[10px] text-gray-400 -mt-1.5">
        This workflow is invoked by an A2A message. There is no path or schedule to
        configure — callers send a payload, and it becomes the workflow&apos;s input.
      </p>

      <Field label="Payload type">
        <Select
          value={inputMode}
          onChange={(v) => s('input_mode', v)}
          options={[
            { value: 'json', label: 'JSON object' },
            { value: 'text', label: 'Plain text' },
          ]}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          {inputMode === 'text'
            ? 'The message body arrives as { text: "..." }.'
            : 'Callers send a JSON object matching the fields below.'}
        </p>
      </Field>

      {inputMode === 'json' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Payload Fields</p>
            <button onClick={addField} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 text-[10px]">
              <Plus size={11} /> Add field
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            The input contract this agent advertises. The Run panel builds its form from these.
          </p>
          {fields.length === 0 && (
            <p className="text-[10px] text-gray-300 italic">No fields — Run panel shows a raw JSON editor.</p>
          )}
          {fields.map((f, i) => (
            <div key={i} className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded-md space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  value={f.name}
                  onChange={(e) => setField(i, 'name', e.target.value)}
                  placeholder="field_name"
                  className={`flex-1 text-[10px] font-mono px-1.5 py-1 border rounded focus:outline-none focus:ring-1 min-w-0 ${
                    !f.name.trim() || duplicates.has(f.name.trim())
                      ? 'border-red-300 focus:ring-red-400 bg-red-50'
                      : 'border-indigo-200 focus:ring-indigo-400'
                  }`}
                />
                <select
                  value={f.type}
                  onChange={(e) => setField(i, 'type', e.target.value)}
                  className="text-[10px] px-1 py-1 border border-indigo-200 rounded focus:outline-none bg-white"
                >
                  {PAYLOAD_FIELD_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
                </select>
                <label className="flex items-center gap-0.5 text-[10px] text-indigo-600 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={f.required} onChange={(e) => setField(i, 'required', e.target.checked)} className="w-3 h-3" />
                  req
                </label>
                <button onClick={() => removeField(i)} className="text-red-300 hover:text-red-500 flex-shrink-0">
                  <Minus size={11} />
                </button>
              </div>
              <input
                value={f.description}
                onChange={(e) => setField(i, 'description', e.target.value)}
                placeholder="Description — shown to callers and in the Run panel"
                className="w-full text-[10px] px-1.5 py-1 border border-indigo-100 rounded focus:outline-none bg-white text-gray-600"
              />
              {duplicates.has(f.name.trim()) && (
                <p className="text-[10px] text-red-500">Duplicate field name.</p>
              )}
              {!f.name.trim() && (
                <p className="text-[10px] text-red-500">Field needs a name.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ─── Transform ────────────────────────────────────────────────────────────── */

const MODES = [
  { value: 'fields',   label: 'Fields'   },
  { value: 'jmespath', label: 'JMESPath' },
  { value: 'python',   label: 'Python'   },
  { value: 'jinja2',   label: 'Jinja2'   },
]

type OutputField = {
  name: string
  type?: string
  source?: string
  default?: unknown
  required?: boolean
}

const FIELD_TYPES = ['string', 'text', 'number', 'integer', 'boolean', 'object', 'array']

/**
 * Declare the output shape and say where each field comes from.
 *
 * Sources come from the backend rather than being guessed here: it already
 * works out what a node can read (the entry payload contract, any declared
 * output structure, what a human node collects, the variables its ancestors
 * saved) in order to check the mapping at compile time. Asking it keeps the
 * picker and the check agreeing.
 */
/**
 * What this node can read, as the compiler works it out.
 *
 * Shared by both mappers — a TRANSFORM's output fields and an MCP_TOOL's
 * arguments — because both ask the same question and must offer the same
 * answer the compiler will accept.
 */
function useNodeInputs(nodeId: string) {
  const nodes = useWorkflowStore((st) => st.nodes)
  const edges = useWorkflowStore((st) => st.edges)
  const [inputs, setInputs] = useState<NodeInput[]>([])
  const [opaque, setOpaque] = useState(false)

  // The canvas as the compiler will see it, so the picker offers exactly what
  // the compiler will accept.
  // No schema_version: the backend stamps the current one, the same way the
  // save path does, so this never goes stale against a migration.
  const canvas = useMemo(() => ({
    nodes: nodes.map((n) => ({
      id: n.id, type: n.type, version: '1', position: n.position,
      metadata: n.data.metadata || { title: '', description: '' },
      config: n.data.config || {},
      io: { input_schema: { type: 'object' }, output_schema: { type: 'object' } },
      policies: { timeout_seconds: 60, retry: { max_attempts: 1 }, on_error: 'fail' },
    })),
    edges: edges.map((e) => ({
      id: e.id, source: e.source, source_handle: e.sourceHandle || 'output',
      target: e.target, target_handle: e.targetHandle || 'input', condition: null,
    })),
  }), [nodes, edges])

  useEffect(() => {
    let cancelled = false
    workflowApi.nodeInputs(canvas, nodeId)
      .then((r) => { if (!cancelled) { setInputs(r.inputs); setOpaque(r.opaque) } })
      .catch(() => { if (!cancelled) { setInputs([]); setOpaque(true) } })
    return () => { cancelled = true }
  }, [canvas, nodeId])

  return { inputs, opaque }
}

/** The dropdown of readable sources, grouped by where the value comes from. */
function SourceSelect({
  value, inputs, onChange,
}: { value: string; inputs: NodeInput[]; onChange: (v: string) => void }) {
  const known = inputs.some((x) => x.path === value)
  const unknown = !!value && !known
  const payload = inputs.filter((x) => x.source === 'payload')
  const variables = inputs.filter((x) => x.source === 'variable')

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full text-[10px] px-1.5 py-1 border rounded bg-white focus:outline-none ${
        unknown ? 'border-amber-400' : 'border-slate-200'
      }`}
    >
      <option value="">— pick a source —</option>
      {payload.length > 0 && (
        <optgroup label="From the previous nodes">
          {payload.map((x) => <option key={x.path} value={x.path}>{x.label}</option>)}
        </optgroup>
      )}
      {variables.length > 0 && (
        <optgroup label="Saved variables">
          {variables.map((x) => <option key={x.path} value={x.path}>{x.label}</option>)}
        </optgroup>
      )}
      {unknown && <option value={value}>{value} (not found)</option>}
    </select>
  )
}

function FieldMapper({ nodeId, cfg, save }: FormProps & { nodeId: string }) {
  const { inputs, opaque } = useNodeInputs(nodeId)
  const fields: OutputField[] = (cfg.output_fields as OutputField[]) || []

  const setFields = (next: OutputField[]) => save({ ...cfg, output_fields: next })
  const add = () => setFields([...fields, { name: '', type: 'string', source: '' }])
  const remove = (i: number) => setFields(fields.filter((_, j) => j !== i))
  const set = (i: number, key: keyof OutputField, value: unknown) =>
    setFields(fields.map((f, j) => (j === i ? { ...f, [key]: value } : f)))

  const byPath = new Map(inputs.map((i) => [i.path, i]))
  const names = fields.map((f) => (f.name || '').trim())

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Output fields
          </p>
          <button onClick={add} className="text-slate-600 hover:text-slate-800 flex items-center gap-0.5 text-[10px]">
            <Plus size={11} /> Add field
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mb-2">
          The shape this node builds. Each field takes its value from something
          available here.
        </p>

        {fields.length === 0 && (
          <p className="text-[10px] text-red-500 mb-1">
            Add at least one field, or switch to an expression mode.
          </p>
        )}

        {fields.map((f, i) => {
          const name = (f.name || '').trim()
          const duplicate = !!name && names.indexOf(name) !== i
          const chosen = f.source ? byPath.get(f.source) : undefined
          const unknownSource = !!f.source && !chosen
          const typeClash = !!chosen && !!f.type && chosen.type !== 'any' && chosen.type !== f.type
          return (
            <div key={i} className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  value={f.name || ''}
                  onChange={(e) => set(i, 'name', e.target.value)}
                  placeholder="field_name"
                  className={`flex-1 text-[10px] font-mono px-1.5 py-1 border rounded focus:outline-none focus:ring-1 min-w-0 ${
                    !name || duplicate
                      ? 'border-red-300 focus:ring-red-400 bg-red-50'
                      : 'border-slate-200 focus:ring-slate-400'
                  }`}
                />
                <select
                  value={f.type || 'string'}
                  onChange={(e) => set(i, 'type', e.target.value)}
                  className="text-[10px] px-1 py-1 border border-slate-200 rounded focus:outline-none bg-white"
                >
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="flex items-center gap-0.5 text-[10px] text-slate-600 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={!!f.required}
                    onChange={(e) => set(i, 'required', e.target.checked)} className="w-3 h-3" />
                  req
                </label>
                <button onClick={() => remove(i)} className="text-red-300 hover:text-red-500 flex-shrink-0">
                  <Minus size={11} />
                </button>
              </div>

              <SourceSelect
                value={f.source || ''}
                inputs={inputs}
                onChange={(v) => set(i, 'source', v)}
              />

              <input
                value={f.default === undefined || f.default === null ? '' : String(f.default)}
                onChange={(e) => set(i, 'default', e.target.value || undefined)}
                placeholder="default if missing (optional)"
                className="w-full text-[10px] px-1.5 py-1 border border-slate-100 rounded bg-white text-gray-600 focus:outline-none"
              />

              {duplicate && <p className="text-[10px] text-red-500">This field is built twice.</p>}
              {!name && <p className="text-[10px] text-red-500">Field needs a name.</p>}
              {!f.source && f.default === undefined && (
                <p className="text-[10px] text-red-500">Pick a source, or give it a default.</p>
              )}
              {unknownSource && (
                <p className="text-[10px] text-amber-600">
                  Nothing upstream is known to produce <code>{f.source}</code>.
                </p>
              )}
              {typeClash && (
                <p className="text-[10px] text-amber-600">
                  {f.source} is {chosen?.type}; it will be converted to {f.type}.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {inputs.length === 0 && (
        <p className="text-[10px] text-amber-600">
          {opaque
            ? 'Nothing upstream declares its shape, so there is nothing to offer. Declare a payload on the entry node, or use an expression mode.'
            : 'Connect this node to something first — it has nothing upstream to read.'}
        </p>
      )}
    </>
  )
}

const MODE_PLACEHOLDERS: Record<string, string> = {
  jmespath: 'body.items[0]',
  python:   'result = {k: v for k, v in data.items() if v}',
  jinja2:   '{"name": "{{ name }}", "upper": "{{ name|upper }}"}',
}

function TransformForm({ cfg, save, nodeId }: FormProps & { nodeId: string }) {
  const mode = String(cfg.mode || 'fields')
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Transform</SectionLabel>
      <Field label="Mode">
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => s('mode', m.value)}
              className={`flex-1 py-1 text-[10px] rounded-md border font-medium transition-colors ${
                mode === m.value
                  ? 'bg-slate-600 border-slate-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-slate-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Field>
      {mode === 'fields' && <FieldMapper nodeId={nodeId} cfg={cfg} save={save} />}

      {mode !== 'fields' && (
      <Field label="Expression">
        <TextArea
          value={String(cfg.expression || '')}
          onChange={(v) => s('expression', v)}
          placeholder={MODE_PLACEHOLDERS[mode]}
          rows={mode === 'python' ? 8 : 3}
          mono
        />
        {mode === 'python' && (
          <p className="text-[10px] text-gray-400 mt-1">
            Use <code className="bg-gray-100 px-0.5 rounded">data</code> for input, set <code className="bg-gray-100 px-0.5 rounded">result</code> for output.
          </p>
        )}
      </Field>
      )}

      <Field label="Output key (optional)">
        <TextInput value={String(cfg.output_key || '')} onChange={(v) => s('output_key', v || undefined)} placeholder="wrap result in this key" />
      </Field>
    </section>
  )
}


/* ─── MCP Tool Call ───────────────────────────────────────────────────────── */

/**
 * Call one tool on an MCP server, as a step in the flow.
 *
 * The whole point of Fetch tools is that nothing here has to be typed from
 * memory: the server is asked what it has, the answer fills the picker, and
 * picking a tool pre-fills one argument row per parameter it declares — with
 * the right names, the right types and the required ones marked. The schema is
 * kept on the node too, so the compiler can check the arguments at build time
 * without making a network call of its own.
 */
function McpToolForm({ cfg, save, nodeId }: FormProps & { nodeId: string }) {
  const { inputs } = useNodeInputs(nodeId)
  const [tools, setTools] = useState<McpTool[]>([])
  const [fetching, setFetching] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const url = String(cfg.mcp_url || '')
  const token = String(cfg.auth_token || '')
  const toolName = String(cfg.tool_name || '')
  const argMode = String(cfg.arg_mode || 'fields')
  const args: OutputField[] = (cfg.arg_fields as OutputField[]) || []
  const schema = (cfg.tool_schema as { properties?: Record<string, unknown>; required?: string[] }) || {}
  const declared = Object.keys(schema.properties || {})
  const required = new Set(schema.required || [])

  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })

  const fetchTools = async () => {
    setFetching(true)
    setProblem(null)
    try {
      const { tools: found, error } = await mcpApi.listTools(url, token)
      setTools(found)
      setFetched(true)
      setProblem(error)
    } catch {
      setProblem('The platform could not reach its own API. Is the backend running?')
    } finally {
      setFetching(false)
    }
  }

  /** Picking a tool replaces the argument rows with that tool's parameters. */
  const chooseTool = (name: string) => {
    const tool = tools.find((t) => t.name === name)
    if (!tool) {
      s('tool_name', name)
      return
    }
    save({
      ...cfg,
      tool_name: tool.name,
      tool_description: tool.description,
      tool_schema: tool.input_schema,
      // Keep a source the user already picked for an argument of the same
      // name: re-fetching a server should not throw away their mapping.
      arg_fields: tool.arguments.map((a) => {
        const existing = args.find((f) => (f.name || '').trim() === a.name)
        return {
          name: a.name,
          type: a.type,
          source: existing?.source || '',
          ...(existing?.default !== undefined ? { default: existing.default } : {}),
          ...(a.required ? { required: true } : {}),
        }
      }),
    })
  }

  const setArgs = (next: OutputField[]) => s('arg_fields', next)
  const setArg = (i: number, key: keyof OutputField, value: unknown) =>
    setArgs(args.map((f, j) => (j === i ? { ...f, [key]: value } : f)))

  const selected = tools.find((t) => t.name === toolName)
  const unmapped = [...required].filter(
    (r) => !args.some((f) => (f.name || '').trim() === r && (f.source || f.default !== undefined)),
  )

  return (
    <section className="space-y-3">
      <SectionLabel>MCP Server</SectionLabel>
      <p className="text-[10px] text-gray-400">
        Calls one tool directly, every time the flow reaches this node — no
        agent and no model deciding. The tool&rsquo;s result is merged into the
        payload for the next node.
      </p>

      <Field label="Server URL">
        <TextInput
          value={url}
          onChange={(v) => s('mcp_url', v)}
          placeholder="http://localhost:8000/mcp"
          mono
        />
        <p className="text-[10px] text-gray-400 mt-1">
          A base URL, a <code>/mcp</code> endpoint or a <code>/sse</code> one —
          each is tried in turn.
        </p>
      </Field>

      <Field label="Auth token (optional)">
        <TextInput
          value={token}
          onChange={(v) => s('auth_token', v || undefined)}
          placeholder="sent as Authorization: Bearer …"
          mono
        />
      </Field>

      <button
        onClick={fetchTools}
        disabled={!url.trim() || fetching}
        className="w-full text-[10px] py-1.5 rounded-md flex items-center justify-center gap-1 border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {fetching ? <Loader2 size={11} className="animate-spin" /> : <PlugZap size={11} />}
        {fetching ? 'Asking the server…' : 'Fetch tools'}
      </button>

      {problem && <p className="text-[10px] text-red-500">{problem}</p>}
      {fetched && !problem && (
        <p className="text-[10px] text-green-600">
          {tools.length} tool{tools.length === 1 ? '' : 's'} on this server.
        </p>
      )}

      <Field label="Tool">
        {tools.length > 0 ? (
          <Select
            value={toolName}
            onChange={chooseTool}
            options={[
              { value: '', label: '— pick a tool —' },
              ...tools.map((t) => ({
                value: t.name,
                label: t.description ? `${t.name} — ${t.description}` : t.name,
              })),
            ]}
          />
        ) : (
          <>
            <TextInput
              value={toolName}
              onChange={(v) => s('tool_name', v)}
              placeholder="fetch the tools to pick one"
              mono
            />
            {!!toolName && (
              <p className="text-[10px] text-gray-400 mt-1">
                Saved from an earlier fetch. Fetch again to re-check it still
                exists and refresh its arguments.
              </p>
            )}
          </>
        )}
        {selected?.description && (
          <p className="text-[10px] text-gray-500 mt-1">{selected.description}</p>
        )}
      </Field>

      {!!toolName && (
        <>
          <SectionLabel>Arguments</SectionLabel>
          <Field label="Where the arguments come from">
            <Select
              value={argMode}
              onChange={(v) => s('arg_mode', v)}
              options={[
                { value: 'fields', label: 'Map each one (recommended)' },
                { value: 'passthrough', label: 'Send the whole payload' },
              ]}
            />
          </Field>

          {argMode === 'passthrough' ? (
            <p className="text-[10px] text-amber-600">
              The payload carries keys from every earlier node. A server that
              validates its input strictly will reject the extra ones.
            </p>
          ) : (
            <>
              {args.length === 0 && (
                <p className="text-[10px] text-gray-400">
                  This tool takes no arguments.
                </p>
              )}
              {unmapped.length > 0 && (
                <p className="text-[10px] text-red-500">
                  Required and not mapped: {unmapped.join(', ')}.
                </p>
              )}
              {args.map((f, i) => {
                const name = (f.name || '').trim()
                const isRequired = required.has(name) || !!f.required
                const unknownArg = declared.length > 0 && !declared.includes(name)
                const missing = isRequired && !f.source && f.default === undefined
                const described = selected?.arguments.find((a) => a.name === name)
                return (
                  <div key={i} className="p-2 bg-blue-50/50 border border-blue-100 rounded-md space-y-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-blue-800 flex-1 truncate">
                        {name || '(unnamed)'}
                        {isRequired && <span className="text-red-400"> *</span>}
                      </span>
                      <span className="text-[10px] text-gray-400">{f.type || 'string'}</span>
                      <button
                        onClick={() => setArgs(args.filter((_, j) => j !== i))}
                        className="text-red-300 hover:text-red-500 flex-shrink-0"
                        title="don't send this argument"
                      >
                        <Minus size={11} />
                      </button>
                    </div>
                    {described?.description && (
                      <p className="text-[10px] text-gray-400">{described.description}</p>
                    )}
                    <SourceSelect
                      value={f.source || ''}
                      inputs={inputs}
                      onChange={(v) => setArg(i, 'source', v)}
                    />
                    <input
                      value={f.default === undefined || f.default === null ? '' : String(f.default)}
                      onChange={(e) => setArg(i, 'default', e.target.value || undefined)}
                      placeholder={isRequired ? 'or a fixed value' : 'fixed value (optional)'}
                      className="w-full text-[10px] px-1.5 py-1 border border-blue-100 rounded bg-white text-gray-600 focus:outline-none"
                    />
                    {missing && (
                      <p className="text-[10px] text-red-500">
                        Required — pick a source or give it a fixed value.
                      </p>
                    )}
                    {unknownArg && (
                      <p className="text-[10px] text-amber-600">
                        The server does not declare this argument. Re-fetch if
                        the tool has changed.
                      </p>
                    )}
                  </div>
                )
              })}
            </>
          )}

          <Field label="Put the result under a key (optional)">
            <TextInput
              value={String(cfg.result_key || '')}
              onChange={(v) => s('result_key', v || undefined)}
              placeholder="merged into the payload when empty"
              mono
            />
          </Field>
        </>
      )}
    </section>
  )
}

/* ─── Condition ────────────────────────────────────────────────────────────── */

type Branch = { name: string; expression: string }

function ConditionForm({ cfg, save }: FormProps) {
  const branches: Branch[] = (cfg.branches as Branch[]) || []
  const update = (b: Branch[]) => save({ ...cfg, branches: b })
  const add = () => update([...branches, { name: `branch_${branches.length + 1}`, expression: 'True' }])
  const remove = (i: number) => update(branches.filter((_, j) => j !== i))
  const set = (i: number, key: keyof Branch, val: string) =>
    update(branches.map((b, j) => (j === i ? { ...b, [key]: val } : b)))

  return (
    <section className="space-y-3">
      <SectionLabel>Condition Branches</SectionLabel>
      <p className="text-[10px] text-gray-400">Evaluated top-to-bottom. First match wins. Use <code className="bg-gray-100 px-0.5 rounded">data</code> to access input fields.</p>
      {branches.map((b, i) => (
        <div key={i} className="p-2 bg-red-50 border border-red-100 rounded-md space-y-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-red-400 font-mono w-3">{i + 1}</span>
            <input
              value={b.name}
              onChange={(e) => set(i, 'name', e.target.value)}
              placeholder="branch name (used as edge handle)"
              className="flex-1 text-[10px] font-mono px-1.5 py-1 border border-red-200 rounded focus:outline-none"
            />
            <button onClick={() => remove(i)} className="text-red-300 hover:text-red-500">
              <Minus size={11} />
            </button>
          </div>
          <textarea
            value={b.expression}
            onChange={(e) => set(i, 'expression', e.target.value)}
            rows={2}
            placeholder='data.get("score") > 50'
            className="w-full text-[10px] font-mono px-1.5 py-1 border border-red-200 rounded resize-none focus:outline-none"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="w-full text-[10px] py-1.5 border border-dashed border-red-300 text-red-400 rounded-md hover:bg-red-50 flex items-center justify-center gap-1"
      >
        <Plus size={11} /> Add branch
      </button>
    </section>
  )
}

/* ─── Loop ─────────────────────────────────────────────────────────────────── */

/**
 * The keys here are the ones the LOOP node actually declares: `mode`,
 * `items_path`, `exit_condition`, `max_iterations`.
 *
 * This form used to write `items_expression` and `item_variable`, which nothing
 * read, and offered no way to set `items_path` at all — so every loop built in
 * the UI reached the generated package with no list to walk and iterated zero
 * times without complaining.
 */
function LoopForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const mode = String(cfg.mode || 'for_each')
  const itemsPath = String(cfg.items_path || '')
  const exitCondition = String(cfg.exit_condition || '')

  return (
    <section className="space-y-3">
      <SectionLabel>Loop</SectionLabel>
      <p className="text-[10px] text-orange-700 bg-orange-50 border border-orange-100 rounded-md px-2 py-1.5 leading-relaxed">
        A loop is a cycle on the canvas: wire <strong>loop body</strong> to the
        work you want repeated, bring that path back to this node, and wire
        <strong> done</strong> to whatever comes after.
      </p>

      <Field label="Mode">
        <Select
          value={mode}
          onChange={(v) => s('mode', v)}
          options={[
            { value: 'for_each', label: 'For each — walk a list' },
            { value: 'while', label: 'While — repeat until a condition is true' },
          ]}
        />
      </Field>

      {mode === 'for_each' ? (
        <Field label="Path to the list">
          <TextInput
            value={itemsPath}
            onChange={(v) => s('items_path', v)}
            placeholder="items  or  data.items"
            mono
          />
          {!itemsPath.trim() ? (
            <p className="text-[10px] text-red-500 mt-1">
              Required — without it the loop has nothing to walk.
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 mt-1">
              Read once when the loop starts, so the body cannot change what is
              being walked. Each pass sets <code className="bg-gray-100 px-0.5 rounded">current_item</code> and{' '}
              <code className="bg-gray-100 px-0.5 rounded">current_index</code>.
            </p>
          )}
        </Field>
      ) : (
        <Field label="Exit condition">
          <TextInput
            value={exitCondition}
            onChange={(v) => s('exit_condition', v)}
            placeholder="i >= 5"
            mono
          />
          {!exitCondition.trim() ? (
            <p className="text-[10px] text-red-500 mt-1">
              Required — without it the loop only stops at the cap below.
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 mt-1">
              Checked before each pass; the loop leaves when it is true.{' '}
              <code className="bg-gray-100 px-0.5 rounded">data</code> is the latest payload,{' '}
              <code className="bg-gray-100 px-0.5 rounded">i</code> the iteration count.
            </p>
          )}
        </Field>
      )}

      <Field label="Max iterations">
        <NumberInput value={Number(cfg.max_iterations || 100)} onChange={(v) => s('max_iterations', v)} min={1} max={10000} />
        <p className="text-[10px] text-gray-400 mt-1">
          Hard stop — ADK has no step limit of its own. Reaching it sets{' '}
          <code className="bg-gray-100 px-0.5 rounded">truncated</code> on the result.
        </p>
      </Field>
    </section>
  )
}

/* ─── Variable ─────────────────────────────────────────────────────────────── */

// A tool group is resolved into its consumer's tool list and a MERGE is a
// JoinNode, so neither produces a result of its own to name.
// Mirrors _NO_VARIABLE in app/nodes/registry.py: types that produce no result
// of their own. A tool group is resolved into its consumer's tool list, MERGE
// is a JoinNode, and a fork hands each branch the payload it was given —
// naming that would just save a second copy of the previous node's output.
const NO_VARIABLE = new Set([
  'SEQUENTIAL_AGENT', 'PARALLEL_AGENT', 'MERGE', 'PARALLEL_FORK',
])

// Mirrors app/nodes/variables.py. Variables are flat session-state keys, which
// is how ADK does it, so they must not collide with what already lives there.
const RESERVED_VARIABLES = new Set(['wf'])
const RESERVED_PREFIXES = ['_loop_', 'app:', 'user:', 'temp:', '_']

function variableProblem(name: string): string | null {
  const value = name.trim()
  if (!value) return null
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
    return 'Use a letter followed by letters, digits or underscores.'
  }
  if (RESERVED_VARIABLES.has(value) || RESERVED_PREFIXES.some((p) => value.startsWith(p))) {
    return "Reserved — 'wf', '_loop_*', 'app:', 'user:' and 'temp:' are taken."
  }
  return null
}

/**
 * Name this node's result so later nodes can read it.
 *
 * Shown for every node type rather than repeated in twenty forms. The value is
 * written to workflow state as a top-level key — the same place an agent's
 * `output_key` goes, and where ADK binds node parameters from.
 */
function VariableField({ nodeType, cfg, save }: FormProps & { nodeType: string }) {
  if (NO_VARIABLE.has(nodeType)) return null

  const name = String(cfg.output_variable || '')
  const problem = variableProblem(name)

  return (
    <section className="space-y-3">
      <SectionLabel>Variable</SectionLabel>
      <Field label="Save result as">
        <TextInput
          value={name}
          onChange={(v) => save({ ...cfg, output_variable: v || undefined })}
          placeholder="priced_order  (optional)"
          mono
        />
        {problem ? (
          <p className="text-[10px] text-red-500 mt-1">{problem}</p>
        ) : name ? (
          <p className="text-[10px] text-gray-400 mt-1">
            Later nodes read it as <code className="bg-gray-100 px-0.5 rounded">vars[&apos;{name}&apos;]</code> in a
            Transform expression or a Condition branch.
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 mt-1">
            Leave empty and this node&apos;s result only reaches the next node
            along the edge.
          </p>
        )}
      </Field>
    </section>
  )
}

/* ─── Wait ─────────────────────────────────────────────────────────────────── */

const WAIT_UNIT_SECONDS: Record<string, number> = { seconds: 1, minutes: 60 }
// Matches app/nodes/tasks/wait.py.
const WAIT_MAX_SECONDS = 3600
const WAIT_BLOCKING_COMFORT = 60

function WaitForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const unit = String(cfg.unit || 'seconds')
  const duration = Number(cfg.duration ?? 5)
  const seconds = duration * (WAIT_UNIT_SECONDS[unit] ?? 1)

  return (
    <section className="space-y-3">
      <SectionLabel>Wait</SectionLabel>
      <p className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2 py-1.5 leading-relaxed">
        The run pauses here and carries on by itself. Other parallel branches
        keep running meanwhile — the wait does not hold them up.
      </p>

      <Field label="Wait for">
        <div className="flex gap-2">
          <div className="flex-1">
            <NumberInput
              value={duration}
              onChange={(v) => s('duration', v)}
              min={0}
              max={WAIT_MAX_SECONDS}
            />
          </div>
          <div className="flex-1">
            <Select
              value={unit}
              onChange={(v) => s('unit', v)}
              options={[
                { value: 'seconds', label: 'seconds' },
                { value: 'minutes', label: 'minutes' },
              ]}
            />
          </div>
        </div>
        {seconds <= 0 ? (
          <p className="text-[10px] text-red-500 mt-1">
            Set a duration, or remove the node — this would not wait at all.
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 mt-1">
            Pauses {seconds < 60 ? `${seconds}s` : `${(seconds / 60).toFixed(seconds % 60 ? 1 : 0)} min`} before the next node.
          </p>
        )}
      </Field>

      {seconds > WAIT_MAX_SECONDS && (
        <p className="text-[10px] text-red-500">
          Over the {WAIT_MAX_SECONDS / 60}-minute limit. A wait this long belongs
          outside the workflow — have a scheduler start it later rather than
          holding a run open.
        </p>
      )}
      {seconds > WAIT_BLOCKING_COMFORT && seconds <= WAIT_MAX_SECONDS && (
        <p className="text-[10px] text-amber-600">
          A blocking caller holds its connection open for the whole wait. Run
          this workflow in <strong>Task</strong> mode and poll for the result.
        </p>
      )}

      <p className="text-[10px] text-gray-400 leading-relaxed">
        The wait is held in the running process, so a restart loses it. ADK has
        no timer of its own; this node&apos;s execution timeout is raised to
        cover the wait so it is not killed part way through.
      </p>
    </section>
  )
}

/* ─── End ──────────────────────────────────────────────────────────────────── */

type Mapping = { from: string; to: string }

function EndForm({ cfg, save }: FormProps) {
  const mappings: Mapping[] = Object.entries((cfg.output_mapping as Record<string, string>) || {}).map(([k, v]) => ({ from: k, to: v }))
  const saveMap = (m: Mapping[]) =>
    save({ ...cfg, output_mapping: Object.fromEntries(m.map((r) => [r.from, r.to])) })
  const add = () => saveMap([...mappings, { from: '', to: '' }])
  const remove = (i: number) => saveMap(mappings.filter((_, j) => j !== i))
  const set = (i: number, key: keyof Mapping, val: string) =>
    saveMap(mappings.map((m, j) => (j === i ? { ...m, [key]: val } : m)))

  return (
    <section className="space-y-3">
      <SectionLabel>End</SectionLabel>
      <Field label="Status">
        <Select
          value={String(cfg.status || 'success')}
          onChange={(v) => save({ ...cfg, status: v })}
          options={[{ value: 'success', label: 'Success' }, { value: 'failed', label: 'Failed' }]}
        />
      </Field>
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-medium text-gray-500">Output mapping</p>
          <button onClick={add} className="text-gray-400 hover:text-gray-600"><Plus size={12} /></button>
        </div>
        <p className="text-[10px] text-gray-400 mb-1.5">Input field → Output field</p>
        {mappings.length === 0 && <p className="text-[10px] text-gray-300 italic">No mapping — full state returned</p>}
        {mappings.map((m, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <input value={m.from} onChange={(e) => set(i, 'from', e.target.value)} placeholder="from"
              className="flex-1 text-[10px] font-mono px-1.5 py-1 border border-gray-200 rounded focus:outline-none" />
            <span className="text-gray-400 text-[10px]">→</span>
            <input value={m.to} onChange={(e) => set(i, 'to', e.target.value)} placeholder="to"
              className="flex-1 text-[10px] font-mono px-1.5 py-1 border border-gray-200 rounded focus:outline-none" />
            <button onClick={() => remove(i)} className="text-red-300 hover:text-red-500"><Minus size={11} /></button>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Agent input / output structure ───────────────────────────────────────── */

/**
 * ADK's two schema fields, authored as field lists.
 *
 * `input_structure` becomes the agent's `input_schema`, which ADK only consults
 * when the agent is *called as a tool* by another agent — that is where the
 * declared fields become the parameters the calling model can fill in.
 * `output_structure` becomes `output_schema`, which constrains the reply
 * wherever the agent runs.
 */
function StructureFields({
  label, hint, fields, onChange,
}: {
  label: string
  hint: string
  fields: PayloadField[]
  onChange: (f: PayloadField[]) => void
}) {
  const add = () => onChange([...fields, { name: '', type: 'string', description: '', required: false }])
  const remove = (i: number) => onChange(fields.filter((_, j) => j !== i))
  const set = (i: number, k: keyof PayloadField, v: string | boolean) =>
    onChange(fields.map((f, j) => (j === i ? { ...f, [k]: v } : f)))

  const names = fields.map((f) => f.name.trim())
  const duplicates = new Set(names.filter((n, i) => n && names.indexOf(n) !== i))
  const invalid = (n: string) => !!n && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <button onClick={add} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5 text-[10px]">
          <Plus size={11} /> Add field
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mb-2">{hint}</p>
      {fields.length === 0 && (
        <p className="text-[10px] text-gray-300 italic mb-1">Not set.</p>
      )}
      {fields.map((f, i) => (
        <div key={i} className="mb-2 p-2 bg-emerald-50 border border-emerald-100 rounded-md space-y-1.5">
          <div className="flex items-center gap-1">
            <input
              value={f.name}
              onChange={(e) => set(i, 'name', e.target.value)}
              placeholder="field_name"
              className={`flex-1 text-[10px] font-mono px-1.5 py-1 border rounded focus:outline-none focus:ring-1 min-w-0 ${
                !f.name.trim() || duplicates.has(f.name.trim()) || invalid(f.name.trim())
                  ? 'border-red-300 focus:ring-red-400 bg-red-50'
                  : 'border-emerald-200 focus:ring-emerald-400'
              }`}
            />
            <select
              value={f.type}
              onChange={(e) => set(i, 'type', e.target.value)}
              className="text-[10px] px-1 py-1 border border-emerald-200 rounded focus:outline-none bg-white"
            >
              {PAYLOAD_FIELD_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
            </select>
            <label className="flex items-center gap-0.5 text-[10px] text-emerald-700 cursor-pointer flex-shrink-0">
              <input type="checkbox" checked={f.required} onChange={(e) => set(i, 'required', e.target.checked)} className="w-3 h-3" />
              req
            </label>
            <button onClick={() => remove(i)} className="text-red-300 hover:text-red-500 flex-shrink-0">
              <Minus size={11} />
            </button>
          </div>
          <input
            value={f.description}
            onChange={(e) => set(i, 'description', e.target.value)}
            placeholder="Description — the calling model reads this"
            className="w-full text-[10px] px-1.5 py-1 border border-emerald-100 rounded focus:outline-none bg-white text-gray-600"
          />
          {duplicates.has(f.name.trim()) && <p className="text-[10px] text-red-500">Duplicate field name.</p>}
          {invalid(f.name.trim()) && (
            <p className="text-[10px] text-red-500">Use letters, digits and underscores; cannot start with a digit.</p>
          )}
          {!f.name.trim() && <p className="text-[10px] text-red-500">Field needs a name.</p>}
        </div>
      ))}
    </div>
  )
}

/**
 * Both structure editors plus the state key, shared by every agent form.
 *
 * `showInput` is false for AGENT and ORCHESTRATOR_AGENT: neither can be wired
 * into a tools handle, and ADK only consults `input_schema` when an agent is
 * called as a tool — so the setting could never do anything for them.
 */
function AgentIoFields({
  cfg, save, usedAsTool, showInput = true,
}: {
  cfg: Record<string, unknown>
  save: (c: Record<string, unknown>) => void
  usedAsTool: boolean
  showInput?: boolean
}) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const inputFields = ((cfg.input_structure as { fields?: PayloadField[] })?.fields) || []
  const outputFields = ((cfg.output_structure as { fields?: PayloadField[] })?.fields) || []

  return (
    <>
      {showInput && (
        <StructureFields
          label="Input structure"
          hint={
            usedAsTool
              ? 'The arguments the calling agent can pass. Without these it can only send one blob of text.'
              : 'Only used when this agent is connected to another agent as a sub-agent. Running in the flow, its input comes from the previous node.'
          }
          fields={inputFields}
          onChange={(f) => s('input_structure', { fields: f })}
        />
      )}
      <StructureFields
        label="Output structure"
        hint="The shape the reply must take. The model is constrained to return exactly this JSON."
        fields={outputFields}
        onChange={(f) => s('output_structure', { fields: f })}
      />
      <Field label="Store reply in state as">
        <TextInput value={String(cfg.output_key || '')} onChange={(v) => s('output_key', v || undefined)}
          placeholder="headline_out  (optional)" mono />
        <p className="text-[10px] text-gray-400 mt-1">
          With an output structure set, the parsed object is stored under this key.
        </p>
      </Field>
    </>
  )
}

/* ─── Model ────────────────────────────────────────────────────────────────── */

// Kept in step with app/nodes/tasks/llm_agent.py, which is the source of truth.
const PROVIDER_MODELS: Record<string, string[]> = {
  google: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  vertex_ai: ['gemini-2.0-flash-001', 'gemini-2.0-flash-lite-001', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro-001', 'gemini-1.5-flash-001'],
}

/**
 * Model options that always include whatever the node actually holds.
 *
 * The config is not restricted to this list — the backend accepts any model id,
 * and a canvas may have been built against a newer one. Falling back to the
 * first option would then display a model the node is not using, which reads as
 * a settings change nobody made.
 */
function modelOptions(models: string[], current: string) {
  const known = models.includes(current)
  const values = known || !current ? models : [current, ...models]
  return values.map((m) => ({
    value: m,
    label: known || m !== current ? m : `${m} (set on this node)`,
  }))
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google', vertex_ai: 'Vertex AI',
}

function LlmAgentForm({ cfg, save, nodeId }: FormProps & { nodeId: string }) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const provider = String(cfg.provider || 'google')
  const models = PROVIDER_MODELS[provider] ?? PROVIDER_MODELS.google
  const currentModel = String(cfg.model || models[0])

  // Whether this agent is wired into something else's tools handle. That is
  // what decides whether its input structure has any effect.
  const edges = useWorkflowStore((st) => st.edges)
  const usedAsTool = edges.some((e) => e.source === nodeId && e.targetHandle === 'tools')

  return (
    <section className="space-y-3">
      <SectionLabel>LLM Agent</SectionLabel>
      <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5 leading-relaxed">
        {usedAsTool
          ? 'Connected as a sub-agent. The agent that owns it calls it as a tool, using the input structure below as its arguments.'
          : 'Running in the flow. Give it tools on the bottom handle, or connect its output to another agent or a tool group to use it as a sub-agent.'}
      </p>

      <Field label="Name (what a calling model sees)">
        <TextInput value={String(cfg.name || '')} onChange={(v) => s('name', v || undefined)}
          placeholder="summariser  (defaults to the node title)" mono />
      </Field>

      <Field label="Description (helps the caller choose it)">
        <TextArea value={String(cfg.description || '')} onChange={(v) => s('description', v || undefined)}
          placeholder="Summarises long text into key points." rows={2} />
      </Field>

      {/* Provider */}
      <Field label="Provider">
        <div className="flex gap-1">
          {(['google', 'vertex_ai'] as const).map((p) => (
            <button
              key={p}
              onClick={() => save({ ...cfg, provider: p, model: PROVIDER_MODELS[p][0] })}
              className={`flex-1 py-1 text-[10px] rounded-md border font-medium transition-colors ${
                provider === p
                  ? p === 'vertex_ai' ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </Field>

      {/* Model */}
      <Field label="Model">
        <Select
          value={currentModel}
          onChange={(v) => s('model', v)}
          options={modelOptions(models, currentModel)}
        />
      </Field>

      {/* API Key — only for google */}
      {provider === 'google' && (
        <Field label="Google API key">
          <input
            type="password"
            value={String(cfg.api_key || '')}
            onChange={(e) => s('api_key', e.target.value || undefined)}
            placeholder="AIza… (leave empty to use GOOGLE_API_KEY env var)"
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Leave empty to use <code className="bg-gray-100 px-0.5 rounded">GOOGLE_API_KEY</code> env var.
          </p>
        </Field>
      )}

      {/* Vertex AI fields */}
      {provider === 'vertex_ai' && (
        <>
          <Field label="GCP Project ID">
            <TextInput value={String(cfg.vertex_project || '')} onChange={(v) => s('vertex_project', v)} placeholder="my-gcp-project-123" mono />
          </Field>
          <Field label="Location / Region">
            <TextInput value={String(cfg.vertex_location || 'us-central1')} onChange={(v) => s('vertex_location', v)} placeholder="us-central1" mono />
          </Field>
          <Field label="Service account JSON (optional)">
            <TextArea
              value={String(cfg.service_account_json || '')}
              onChange={(v) => s('service_account_json', v || undefined)}
              placeholder={'{"type":"service_account","project_id":"..."}'}
              rows={4} mono
            />
            <p className="text-[10px] text-gray-400 mt-1">Leave empty to use Application Default Credentials (ADC).</p>
          </Field>
        </>
      )}

      {/* System prompt */}
      <Field label="System prompt">
        <TextArea value={String(cfg.system_prompt || '')} onChange={(v) => s('system_prompt', v)}
          placeholder="You are a helpful assistant." rows={3} />
      </Field>

      {/* Prompt template */}
      <Field label="Prompt template">
        <TextArea value={String(cfg.prompt_template || '')} onChange={(v) => s('prompt_template', v)}
          placeholder="Summarise: {{ text }}" rows={4} mono />
        <p className="text-[10px] text-gray-400 mt-1">Jinja2 — use input field names as variables. Empty = JSON-dump of input.</p>
      </Field>

      {/* Max tokens */}
      <Field label="Max tokens">
        <NumberInput value={Number(cfg.max_tokens || 1024)} onChange={(v) => s('max_tokens', v)} min={1} max={32768} />
      </Field>

      <AgentIoFields cfg={cfg} save={save} usedAsTool={usedAsTool} />
    </section>
  )
}

/* ─── Agent ────────────────────────────────────────────────────────────────── */

type MCP = { name: string; url: string; transport?: string }
type A2A = { name: string; endpoint: string; description?: string }

const ADK_MODELS = PROVIDER_MODELS.google

function AgentForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const currentModel = String(cfg.model || ADK_MODELS[0])

  const mcpServers: MCP[] = (cfg.mcp_servers as MCP[]) || []
  const a2aAgents: A2A[] = (cfg.a2a_agents as A2A[]) || []

  const setMcp = (i: number, k: keyof MCP, v: string) =>
    s('mcp_servers', mcpServers.map((m, j) => j === i ? { ...m, [k]: v } : m))
  const setA2a = (i: number, k: keyof A2A, v: string) =>
    s('a2a_agents', a2aAgents.map((a, j) => j === i ? { ...a, [k]: v } : a))

  return (
    <section className="space-y-3">
      <SectionLabel>Agent (ADK)</SectionLabel>

      <Field label="Model">
        <Select value={currentModel} onChange={(v) => s('model', v)}
          options={modelOptions(ADK_MODELS, currentModel)} />
      </Field>

      <Field label="System prompt">
        <TextArea value={String(cfg.system_prompt || '')} onChange={(v) => s('system_prompt', v)}
          placeholder="You are a helpful assistant." rows={4} />
      </Field>

      <Field label="GCP Project ID (Vertex AI)">
        <TextInput value={String(cfg.vertex_project || '')} onChange={(v) => s('vertex_project', v)}
          placeholder="my-gcp-project (leave empty to use Google AI Studio key)" mono />
      </Field>
      {!cfg.vertex_project && (
        <Field label="Google API key (AI Studio)">
          <input type="password" value={String(cfg.api_key || '')}
            onChange={(e) => s('api_key', e.target.value || undefined)}
            placeholder="AIza… (leave empty to use GOOGLE_API_KEY env var)"
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono" />
        </Field>
      )}

      {/* MCP Servers */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-medium text-gray-500">MCP Servers</p>
          <button onClick={() => s('mcp_servers', [...mcpServers, { name: '', url: '', transport: 'http' }])}
            className="text-amber-500 hover:text-amber-700"><Plus size={13} /></button>
        </div>
        {mcpServers.length === 0 && <p className="text-[10px] text-gray-400 italic">None — click + to add</p>}
        {mcpServers.map((srv, i) => (
          <div key={i} className="mb-2 p-2 bg-amber-50 border border-amber-100 rounded-md">
            <div className="flex items-center gap-1 mb-1">
              <input value={srv.name} onChange={(e) => setMcp(i, 'name', e.target.value)} placeholder="alias"
                className="flex-1 text-[10px] px-1.5 py-1 border border-amber-200 rounded focus:outline-none" />
              <button onClick={() => s('mcp_servers', mcpServers.filter((_, j) => j !== i))} className="text-red-300 hover:text-red-500">
                <Minus size={11} /></button>
            </div>
            <input value={srv.url} onChange={(e) => setMcp(i, 'url', e.target.value)} placeholder="http://mcp-server/mcp"
              className="w-full text-[10px] px-1.5 py-1 border border-amber-200 rounded focus:outline-none mb-1" />
            <select value={srv.transport || 'http'} onChange={(e) => setMcp(i, 'transport', e.target.value)}
              className="w-full text-[10px] px-1.5 py-1 border border-amber-200 rounded focus:outline-none">
              <option value="http">HTTP</option>
              <option value="sse">SSE</option>
            </select>
          </div>
        ))}
      </div>

      {/* A2A Agents */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-medium text-gray-500">A2A Agents</p>
          <button onClick={() => s('a2a_agents', [...a2aAgents, { name: '', endpoint: '', description: '' }])}
            className="text-amber-500 hover:text-amber-700"><Plus size={13} /></button>
        </div>
        {a2aAgents.length === 0 && <p className="text-[10px] text-gray-400 italic">None — click + to add</p>}
        {a2aAgents.map((ag, i) => (
          <div key={i} className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
            <div className="flex items-center gap-1 mb-1">
              <input value={ag.name} onChange={(e) => setA2a(i, 'name', e.target.value)} placeholder="agent name"
                className="flex-1 text-[10px] px-1.5 py-1 border border-blue-200 rounded focus:outline-none" />
              <button onClick={() => s('a2a_agents', a2aAgents.filter((_, j) => j !== i))} className="text-red-300 hover:text-red-500">
                <Minus size={11} /></button>
            </div>
            <input value={ag.endpoint} onChange={(e) => setA2a(i, 'endpoint', e.target.value)} placeholder="http://agent/a2a"
              className="w-full text-[10px] px-1.5 py-1 border border-blue-200 rounded focus:outline-none mb-1" />
            <input value={ag.description || ''} onChange={(e) => setA2a(i, 'description', e.target.value)} placeholder="What this agent does"
              className="w-full text-[10px] px-1.5 py-1 border border-blue-200 rounded focus:outline-none" />
          </div>
        ))}
      </div>
      <AgentIoFields cfg={cfg} save={save} usedAsTool={false} showInput={false} />
    </section>
  )
}

/* ─── Orchestrator Agent ───────────────────────────────────────────────────── */

type InlineFunction = { name: string; description: string; parameters: string; code: string }

function OrchestratorAgentForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const currentModel = String(cfg.model || ADK_MODELS[0])

  const fns: InlineFunction[] = ((cfg.functions as InlineFunction[]) || []).map((f) => ({
    name: f.name || '',
    description: f.description || '',
    parameters: typeof f.parameters === 'string' ? f.parameters : JSON.stringify(f.parameters || { type: 'object', properties: {} }, null, 2),
    code: f.code || '',
  }))

  const saveFns = (list: InlineFunction[]) =>
    s('functions', list.map((f) => ({
      ...f,
      parameters: (() => { try { return JSON.parse(f.parameters) } catch { return { type: 'object', properties: {} } } })(),
    })))

  const addFn = () => saveFns([...fns, { name: '', description: '', parameters: '{\n  "type": "object",\n  "properties": {}\n}', code: 'result = data' }])
  const removeFn = (i: number) => saveFns(fns.filter((_, j) => j !== i))
  const setFn = (i: number, k: keyof InlineFunction, v: string) =>
    saveFns(fns.map((f, j) => j === i ? { ...f, [k]: v } : f))

  return (
    <section className="space-y-3">
      <SectionLabel>Orchestrator Agent</SectionLabel>

      <p className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1.5 leading-relaxed">
        Connect <strong>TOOL</strong>, <strong>DATASOURCE</strong>, <strong>REMOTE AGENT</strong>, or <strong>FUNCTION</strong> nodes to the <strong>bottom handle</strong> to give this agent access to them as tools. To make several of them run in a set order or all at once, wire them into a <strong>Sequential Tools</strong> or <strong>Parallel Tools</strong> node first.
      </p>

      <Field label="Model">
        <Select value={currentModel} onChange={(v) => s('model', v)}
          options={modelOptions(ADK_MODELS, currentModel)} />
      </Field>

      <Field label="GCP Project ID (Vertex AI)">
        <TextInput value={String(cfg.vertex_project || '')} onChange={(v) => s('vertex_project', v)}
          placeholder="my-gcp-project (leave empty to use Google AI Studio key)" mono />
      </Field>
      {!!cfg.vertex_project && (
        <>
          <Field label="Location / Region">
            <TextInput value={String(cfg.vertex_location || 'us-central1')} onChange={(v) => s('vertex_location', v)} placeholder="us-central1" mono />
          </Field>
          <Field label="Service account JSON (optional)">
            <TextArea value={String(cfg.service_account_json || '')} onChange={(v) => s('service_account_json', v || undefined)}
              placeholder={'{"type":"service_account","project_id":"..."}'} rows={4} mono />
            <p className="text-[10px] text-gray-400 mt-1">Leave empty to use ADC.</p>
          </Field>
        </>
      )}
      {!cfg.vertex_project && (
        <Field label="Google API key (AI Studio)">
          <input type="password" value={String(cfg.api_key || '')}
            onChange={(e) => s('api_key', e.target.value || undefined)}
            placeholder="AIza… (leave empty to use GOOGLE_API_KEY env var)"
            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono" />
        </Field>
      )}

      <Field label="System prompt">
        <TextArea value={String(cfg.system_prompt || '')} onChange={(v) => s('system_prompt', v)}
          placeholder="You are a helpful assistant." rows={4} />
      </Field>

      <Field label="Max iterations">
        <NumberInput value={Number(cfg.max_iterations || 10)} onChange={(v) => s('max_iterations', v)} min={1} max={50} />
      </Field>

      {/* Output field */}
      <Field label="Output field → next node">
        <TextInput
          value={String(cfg.output_field || '')}
          onChange={(v) => s('output_field', v || undefined)}
          placeholder='result  (empty = pass full dict downstream)'
          mono
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Extract this key from the agent's response before passing to the next node via the <strong>output →</strong> handle.
        </p>
      </Field>

      {/* Inline functions */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-medium text-gray-500">Inline functions</p>
          <button onClick={addFn} className="text-purple-500 hover:text-purple-700"><Plus size={13} /></button>
        </div>
        <p className="text-[10px] text-gray-400 mb-1.5">Optional — or connect FUNCTION nodes to the bottom handle instead.</p>
        {fns.map((fn, i) => (
          <div key={i} className="mb-2 p-2 bg-purple-50 border border-purple-100 rounded-md space-y-1.5">
            <div className="flex items-center gap-1">
              <input value={fn.name} onChange={(e) => setFn(i, 'name', e.target.value)} placeholder="function_name"
                className="flex-1 text-[10px] font-mono px-1.5 py-1 border border-purple-200 rounded focus:outline-none" />
              <button onClick={() => removeFn(i)} className="text-red-300 hover:text-red-500"><Minus size={11} /></button>
            </div>
            <input value={fn.description} onChange={(e) => setFn(i, 'description', e.target.value)} placeholder="What this function does"
              className="w-full text-[10px] px-1.5 py-1 border border-purple-200 rounded focus:outline-none" />
            <textarea value={fn.code} onChange={(e) => setFn(i, 'code', e.target.value)} rows={5} placeholder="result = data['value'] * 2"
              className="w-full text-[10px] font-mono px-1.5 py-1 border border-purple-200 rounded resize-none focus:outline-none" />
          </div>
        ))}
      </div>
      <AgentIoFields cfg={cfg} save={save} usedAsTool={false} showInput={false} />
    </section>
  )
}

/* ─── Remote Agent ─────────────────────────────────────────────────────────── */

function RemoteAgentForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Remote Agent (A2A)</SectionLabel>

      <p className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1.5 leading-relaxed">
        Connect this node's <strong>output</strong> to an <strong>Orchestrator Agent's bottom handle</strong> to make it available as a callable tool.
      </p>

      <Field label="Agent name (tool alias)">
        <TextInput value={String(cfg.name || '')} onChange={(v) => s('name', v)} placeholder="billing_agent" mono />
      </Field>
      <Field label="A2A endpoint URL">
        <TextInput value={String(cfg.endpoint || '')} onChange={(v) => s('endpoint', v)} placeholder="http://billing-agent:8080/a2a" mono />
      </Field>
      <Field label="Description (shown to the LLM)">
        <TextArea value={String(cfg.description || '')} onChange={(v) => s('description', v)}
          placeholder="Handles billing queries and payment operations" rows={3} />
      </Field>
      <Field label="Auth token (optional)">
        <TextInput value={String(cfg.auth_token || '')} onChange={(v) => s('auth_token', v)} placeholder="Bearer token" />
      </Field>
    </section>
  )
}

/* ─── Function ─────────────────────────────────────────────────────────────── */

function FunctionForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const paramsStr = typeof cfg.parameters === 'string'
    ? cfg.parameters as string
    : JSON.stringify(cfg.parameters || { type: 'object', properties: {} }, null, 2)

  const saveParams = (raw: string) => {
    try {
      s('parameters', JSON.parse(raw))
    } catch {
      // keep raw string until valid JSON is entered
    }
  }

  return (
    <section className="space-y-3">
      <SectionLabel>Function</SectionLabel>

      <p className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1.5 leading-relaxed">
        Connect this node's <strong>output</strong> to an <strong>Orchestrator Agent's bottom handle</strong> to expose this function as a tool.
      </p>

      <Field label="Function / tool name">
        <TextInput value={String(cfg.name || '')} onChange={(v) => s('name', v)} placeholder="calculate_tax" mono />
      </Field>
      <Field label="Description (shown to the LLM)">
        <TextArea value={String(cfg.description || '')} onChange={(v) => s('description', v)}
          placeholder="Calculates tax given an amount and rate" rows={2} />
      </Field>
      <Field label="Parameters (JSON Schema)">
        <TextArea
          value={paramsStr}
          onChange={(v) => saveParams(v)}
          placeholder={'{\n  "type": "object",\n  "properties": {\n    "amount": {"type": "number"}\n  }\n}'}
          rows={6}
          mono
        />
        <p className="text-[10px] text-gray-400 mt-1">JSON Schema shown to the LLM when used as a tool</p>
      </Field>
      <Field label="Code">
        <TextArea
          value={String(cfg.code || 'result = data')}
          onChange={(v) => s('code', v)}
          placeholder={'result = data["amount"] * data["rate"] / 100'}
          rows={7}
          mono
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Use <code className="bg-gray-100 px-0.5 rounded">data</code> for input dict. Set <code className="bg-gray-100 px-0.5 rounded">result</code> for output.
        </p>
      </Field>
    </section>
  )
}

/* ─── MCP (Tool / Datasource) ──────────────────────────────────────────────── */

function McpForm({ label, cfg, save }: FormProps & { label: string }) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>{label} (MCP)</SectionLabel>
      <Field label="MCP Server URL">
        <TextInput value={String(cfg.mcp_url || '')} onChange={(v) => s('mcp_url', v)} placeholder="http://mcp-server:3000/mcp" mono />
      </Field>
      <Field label="Tool name">
        <TextInput value={String(cfg.tool_name || '')} onChange={(v) => s('tool_name', v)} placeholder="query_database" mono />
      </Field>
      <Field label="Args JMESPath (optional)">
        <TextInput value={String(cfg.args_jmespath || '')} onChange={(v) => s('args_jmespath', v || undefined)} placeholder="{query: query}" mono />
      </Field>

      {/* A guard on a capability, not a step in the flow: the model picks the
          moment, a person decides whether it may. */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!cfg.require_confirmation}
          onChange={(e) => s('require_confirmation', e.target.checked || undefined)}
          className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
        />
        <span className="text-[11px] text-gray-700 leading-snug">
          Ask a human first
          <span className="block text-[10px] text-gray-400">
            The run stops the moment the agent tries to use this tool, naming
            the call it wants to make, and the MCP request is not sent until
            someone approves.
          </span>
        </span>
      </label>

      {!!cfg.require_confirmation && (
        <p className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2 py-1.5 leading-relaxed">
          The task parks at <strong>input-required</strong>, the same as a
          Human Approval node — answered the same way. Rejecting tells the
          model the call was refused; the server is never contacted.
        </p>
      )}
    </section>
  )
}

/* ─── Human Approval ───────────────────────────────────────────────────────── */

/**
 * The keys here are the ones the node declares: `prompt`, `assignees` and
 * `collect_fields`.
 *
 * This form used to write `message`, `approvers` and `timeout_seconds`, none
 * of which anything read — the same disconnect the LOOP panel had. The timeout
 * is gone for good: the node parks the A2A task at `input-required` with
 * nothing waiting on a clock, so an approval cannot expire inside the package.
 */
function HumanApprovalForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const prompt = String(cfg.prompt || '')
  const assignees: string[] = Array.isArray(cfg.assignees) ? (cfg.assignees as string[]) : []
  const collected: PayloadField[] = ((cfg.collect_fields as { fields?: PayloadField[] })?.fields) || []

  return (
    <section className="space-y-3">
      <SectionLabel>Human Approval</SectionLabel>
      <p className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2 py-1.5 leading-relaxed">
        The run stops here and the A2A task reports <strong>input-required</strong> until
        someone answers. Wire both <strong>approved</strong> and <strong>rejected</strong> onward.
      </p>

      <Field label="Question for the approver">
        <TextArea value={prompt} onChange={(v) => s('prompt', v)}
          placeholder="This expense is over the limit. Approve it?" rows={3} />
        {!prompt.trim() && (
          <p className="text-[10px] text-amber-600 mt-1">
            Without this the task just says &ldquo;Approve this step?&rdquo;, which tells
            the approver nothing about what they are approving.
          </p>
        )}
      </Field>

      <Field label="Assign to (comma-separated)">
        <TextInput
          value={assignees.join(', ')}
          onChange={(v) => s('assignees', v.split(',').map((x) => x.trim()).filter(Boolean))}
          placeholder="finance@example.com"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Passed to the caller on the paused task as routing information. The
          packaged agent does not notify anyone itself.
        </p>
      </Field>

      <StructureFields
        label="Also ask for"
        hint={'Collected alongside the decision. Marking one required enforces it on approval only — a rejection never needs them.'}
        fields={collected}
        onChange={(f) => s('collect_fields', { fields: f })}
      />
    </section>
  )
}

/* ─── Human Input ──────────────────────────────────────────────────────────── */

/**
 * The sibling of HumanApprovalForm. Same pause, different question: values the
 * workflow needs rather than a decision, so there is no approve/reject and the
 * collected fields are the whole point.
 */
function HumanInputForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const prompt = String(cfg.prompt || '')
  const assignees: string[] = Array.isArray(cfg.assignees) ? (cfg.assignees as string[]) : []
  const collected: PayloadField[] = ((cfg.collect_fields as { fields?: PayloadField[] })?.fields) || []

  return (
    <section className="space-y-3">
      <SectionLabel>Human Input</SectionLabel>
      <p className="text-[10px] text-violet-700 bg-violet-50 border border-violet-100 rounded-md px-2 py-1.5 leading-relaxed">
        The run stops here and the A2A task reports <strong>input-required</strong> until
        someone supplies these values. They are merged into the payload and the run continues.
      </p>

      <Field label="What to ask for">
        <TextArea value={prompt} onChange={(v) => s('prompt', v)}
          placeholder="We need shipping details before this can ship." rows={3} />
        {!prompt.trim() && (
          <p className="text-[10px] text-amber-600 mt-1">
            Without this the paused task will not say why the workflow needs these values.
          </p>
        )}
      </Field>

      <Field label="Assign to (comma-separated)">
        <TextInput
          value={assignees.join(', ')}
          onChange={(v) => s('assignees', v.split(',').map((x) => x.trim()).filter(Boolean))}
          placeholder="ops@example.com"
        />
      </Field>

      <StructureFields
        label="Values to collect"
        hint={'Required ones are enforced by the node: an incomplete answer asks again rather than failing the run.'}
        fields={collected}
        onChange={(f) => s('collect_fields', { fields: f })}
      />
      {collected.length === 0 && (
        <p className="text-[10px] text-red-500">
          Add at least one field — otherwise the run pauses to ask for nothing.
        </p>
      )}
    </section>
  )
}

/* ─── Subworkflow ──────────────────────────────────────────────────────────── */

function SubworkflowForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Sub-workflow</SectionLabel>
      <Field label="Workflow ID">
        <TextInput value={String(cfg.workflow_id || '')} onChange={(v) => s('workflow_id', v)} placeholder="uuid of the target workflow" mono />
      </Field>
      <Field label="Input mapping (JMESPath)">
        <TextInput value={String(cfg.input_mapping || '')} onChange={(v) => s('input_mapping', v)} placeholder="{id: data.id}" mono />
      </Field>
    </section>
  )
}

/* ─── Parallel Fork ────────────────────────────────────────────────────────── */

function ParallelForkForm({ cfg, save, nodeId }: FormProps & { nodeId: string }) {
  const edges = useWorkflowStore((st) => st.edges)
  const branches: string[] = (cfg.branches as string[]) || []
  const wired = new Set(
    edges.filter((e) => e.source === nodeId).map((e) => e.sourceHandle || 'output'),
  )

  const update = (next: string[]) => save({ ...cfg, branches: next })
  const add = () => update([...branches, `branch_${branches.length + 1}`])
  const rename = (i: number, name: string) =>
    update(branches.map((b, j) => (j === i ? name : b)))
  const remove = (i: number) => update(branches.filter((_, j) => j !== i))

  return (
    <section className="space-y-3">
      <SectionLabel>Parallel Branches</SectionLabel>
      <p className="text-[10px] text-gray-400">
        Every branch runs at the same time, each receiving this node's input
        unchanged. Drag from a handle on the right of the node to wire one up —
        a fresh handle appears each time, so you never run out. All branches
        must rejoin at a <strong>Merge</strong> node.
      </p>

      {branches.length < 2 && (
        <p className="text-[10px] text-red-500">
          A fork needs at least two branches; with one there is nothing to run
          in parallel.
        </p>
      )}

      {branches.map((name, i) => {
        const duplicate = branches.indexOf(name) !== i
        return (
          <div key={i} className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                wired.has(name) ? 'bg-teal-500' : 'bg-gray-300'
              }`}
              title={wired.has(name) ? 'connected' : 'nothing connected yet'}
            />
            <input
              value={name}
              onChange={(e) => rename(i, e.target.value)}
              placeholder="branch name (used as the edge handle)"
              className={`flex-1 text-[10px] font-mono px-1.5 py-1 border rounded focus:outline-none focus:ring-1 min-w-0 ${
                !name.trim() || duplicate
                  ? 'border-red-300 bg-red-50 focus:ring-red-400'
                  : 'border-teal-200 focus:ring-teal-400'
              }`}
            />
            <button
              onClick={() => remove(i)}
              className="text-red-300 hover:text-red-500 flex-shrink-0"
              title={wired.has(name) ? 'removing this leaves its edge dangling' : 'remove'}
            >
              <Minus size={11} />
            </button>
          </div>
        )
      })}

      <button
        onClick={add}
        className="w-full text-[10px] py-1.5 border border-dashed border-teal-300 text-teal-500 rounded-md hover:bg-teal-50 flex items-center justify-center gap-1"
      >
        <Plus size={11} /> Add branch
      </button>

      <p className="text-[10px] text-gray-400">
        Renaming a branch that is already wired changes the handle its edge
        points at — redraw that edge afterwards.
      </p>
    </section>
  )
}

/* ─── Merge ────────────────────────────────────────────────────────────────── */

function MergeForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Merge</SectionLabel>
      <p className="text-[10px] text-gray-400">
        Where the branches of a <strong>Parallel Fork</strong> come back
        together. Every branch must reach this node, and it always waits for
        all of them — that comes from ADK's join node and is not a setting.
      </p>
      {/* There used to be a Strategy control here offering all / first / any.
          None of the three was even in the schema's enum, so any Merge touched
          in this panel failed to compile; and "continue on the first" was never
          possible anyway. Saved canvases are cleaned up in the v6 -> v7
          migration. */}
      <Field label="Combine branches">
        <Select
          value={String(cfg.merge_mode || 'merge')}
          onChange={(v) => s('merge_mode', v)}
          options={[
            { value: 'merge', label: 'Merge — one object with every branch\u2019s keys' },
            { value: 'array', label: 'Array — results[] in branch order' },
            { value: 'first', label: 'First — only the first branch\u2019s output' },
          ]}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          {cfg.merge_mode === 'array'
            ? 'The next node reads data.results — a list, in the order the branches leave the fork.'
            : cfg.merge_mode === 'first'
            ? 'The other branches still run; their output is dropped here.'
            : 'Two branches producing the same key: the later one wins.'}
        </p>
      </Field>
    </section>
  )
}

