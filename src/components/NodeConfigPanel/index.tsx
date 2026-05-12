import React, { useState, useEffect } from 'react'
import { X, Trash2, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import { PALETTE_BY_TYPE } from '../../nodes/index'

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
        {nodeType === 'HTTP_TRIGGER'      && <HttpTriggerForm      cfg={cfg} save={save} />}
        {nodeType === 'SCHEDULE_TRIGGER'  && <ScheduleTriggerForm  cfg={cfg} save={save} />}
        {nodeType === 'WEBHOOK_TRIGGER'   && <WebhookTriggerForm   cfg={cfg} save={save} />}
        {nodeType === 'QUEUE_TRIGGER'     && <QueueTriggerForm     cfg={cfg} save={save} />}
        {nodeType === 'TRANSFORM'            && <TransformForm           cfg={cfg} save={save} />}
        {nodeType === 'CONDITION'            && <ConditionForm           cfg={cfg} save={save} />}
        {nodeType === 'LOOP'                 && <LoopForm                cfg={cfg} save={save} />}
        {nodeType === 'END'                  && <EndForm                 cfg={cfg} save={save} />}
        {nodeType === 'MODEL'                && <ModelForm               cfg={cfg} save={save} />}
        {nodeType === 'ORCHESTRATOR_AGENT'   && <OrchestratorAgentForm   cfg={cfg} save={save} />}
        {nodeType === 'REMOTE_AGENT'         && <RemoteAgentForm         cfg={cfg} save={save} />}
        {nodeType === 'FUNCTION'             && <FunctionForm            cfg={cfg} save={save} />}
        {nodeType === 'AGENT'                && <AgentForm               cfg={cfg} save={save} />}
        {nodeType === 'TOOL'                 && <McpForm label="Tool"        cfg={cfg} save={save} />}
        {nodeType === 'DATASOURCE'           && <McpForm label="Data Source" cfg={cfg} save={save} />}
        {nodeType === 'HUMAN_APPROVAL'    && <HumanApprovalForm    cfg={cfg} save={save} />}
        {nodeType === 'SUBWORKFLOW'       && <SubworkflowForm      cfg={cfg} save={save} />}
        {nodeType === 'PARALLEL_FORK'     && <ParallelForkForm     cfg={cfg} save={save} />}
        {nodeType === 'MERGE'             && <MergeForm            cfg={cfg} save={save} />}

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

/* ─── HTTP Trigger ─────────────────────────────────────────────────────────── */

type BodyField = { name: string; type: string; description: string; required: boolean }

function HttpTriggerForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const fields: BodyField[] = ((cfg.body_schema as { fields?: BodyField[] })?.fields) || []

  const saveFields = (f: BodyField[]) => s('body_schema', { fields: f })
  const addField = () => saveFields([...fields, { name: '', type: 'string', description: '', required: false }])
  const removeField = (i: number) => saveFields(fields.filter((_, j) => j !== i))
  const setField = (i: number, k: keyof BodyField, v: string | boolean) =>
    saveFields(fields.map((f, j) => j === i ? { ...f, [k]: v } : f))

  return (
    <section className="space-y-3">
      <SectionLabel>HTTP Trigger</SectionLabel>
      <Field label="Path">
        <TextInput value={String(cfg.path || '/run')} onChange={(v) => s('path', v)} placeholder="/webhook" mono />
      </Field>
      <Field label="Method">
        <Select
          value={String(cfg.method || 'POST')}
          onChange={(v) => s('method', v)}
          options={['GET','POST','PUT','PATCH','DELETE'].map((m) => ({ value: m, label: m }))}
        />
      </Field>

      {/* Body schema */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Body Fields</p>
          <button onClick={addField} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 text-[10px]">
            <Plus size={11} /> Add field
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mb-2">
          Define the expected request body. The Run modal will generate a form from these.
        </p>
        {fields.length === 0 && (
          <p className="text-[10px] text-gray-300 italic">No fields — Run modal shows a raw JSON editor.</p>
        )}
        {fields.map((f, i) => (
          <div key={i} className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded-md space-y-1.5">
            {/* Row 1: name + type + required + remove */}
            <div className="flex items-center gap-1">
              <input
                value={f.name}
                onChange={(e) => setField(i, 'name', e.target.value)}
                placeholder="field_name"
                className="flex-1 text-[10px] font-mono px-1.5 py-1 border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-0"
              />
              <select
                value={f.type}
                onChange={(e) => setField(i, 'type', e.target.value)}
                className="text-[10px] px-1 py-1 border border-indigo-200 rounded focus:outline-none bg-white"
              >
                <option value="string">string</option>
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="integer">integer</option>
                <option value="boolean">boolean</option>
              </select>
              <label className="flex items-center gap-0.5 text-[10px] text-indigo-600 cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={f.required} onChange={(e) => setField(i, 'required', e.target.checked)} className="w-3 h-3" />
                req
              </label>
              <button onClick={() => removeField(i)} className="text-red-300 hover:text-red-500 flex-shrink-0">
                <Minus size={11} />
              </button>
            </div>
            {/* Row 2: description hint */}
            <input
              value={f.description}
              onChange={(e) => setField(i, 'description', e.target.value)}
              placeholder="Description / hint shown to user"
              className="w-full text-[10px] px-1.5 py-1 border border-indigo-100 rounded focus:outline-none bg-white text-gray-600"
            />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Schedule Trigger ─────────────────────────────────────────────────────── */

function ScheduleTriggerForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Schedule</SectionLabel>
      <Field label="Cron expression">
        <TextInput value={String(cfg.cron || '0 * * * *')} onChange={(v) => s('cron', v)} placeholder="0 * * * *" mono />
        <p className="text-[10px] text-gray-400 mt-1">min hour day month weekday</p>
      </Field>
      <Field label="Timezone">
        <TextInput value={String(cfg.timezone || 'UTC')} onChange={(v) => s('timezone', v)} placeholder="UTC" />
      </Field>
    </section>
  )
}

/* ─── Webhook Trigger ──────────────────────────────────────────────────────── */

function WebhookTriggerForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Webhook</SectionLabel>
      <Field label="Path">
        <TextInput value={String(cfg.path || '/webhook')} onChange={(v) => s('path', v)} placeholder="/webhook" mono />
      </Field>
      <Field label="Secret (optional)">
        <TextInput value={String(cfg.secret || '')} onChange={(v) => s('secret', v)} placeholder="hmac secret" />
      </Field>
    </section>
  )
}

/* ─── Queue Trigger ────────────────────────────────────────────────────────── */

function QueueTriggerForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Queue Trigger</SectionLabel>
      <Field label="Queue name">
        <TextInput value={String(cfg.queue_name || '')} onChange={(v) => s('queue_name', v)} placeholder="my-queue" />
      </Field>
      <Field label="Batch size">
        <NumberInput value={Number(cfg.batch_size || 1)} onChange={(v) => s('batch_size', v)} min={1} max={100} />
      </Field>
    </section>
  )
}

/* ─── Transform ────────────────────────────────────────────────────────────── */

const MODES = [
  { value: 'jmespath', label: 'JMESPath' },
  { value: 'python',   label: 'Python'   },
  { value: 'jinja2',   label: 'Jinja2'   },
]

const MODE_PLACEHOLDERS: Record<string, string> = {
  jmespath: 'body.items[0]',
  python:   'result = {k: v for k, v in data.items() if v}',
  jinja2:   '{"name": "{{ name }}", "upper": "{{ name|upper }}"}',
}

function TransformForm({ cfg, save }: FormProps) {
  const mode = String(cfg.mode || 'jmespath')
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
      <Field label="Output key (optional)">
        <TextInput value={String(cfg.output_key || '')} onChange={(v) => s('output_key', v || undefined)} placeholder="wrap result in this key" />
      </Field>
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

function LoopForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Loop</SectionLabel>
      <Field label="Items (JMESPath or field name)">
        <TextInput value={String(cfg.items_expression || 'items')} onChange={(v) => s('items_expression', v)} placeholder="data.items or items" mono />
      </Field>
      <Field label="Item variable name">
        <TextInput value={String(cfg.item_variable || 'item')} onChange={(v) => s('item_variable', v)} placeholder="item" mono />
      </Field>
      <Field label="Max iterations">
        <NumberInput value={Number(cfg.max_iterations || 100)} onChange={(v) => s('max_iterations', v)} min={1} max={10000} />
      </Field>
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

/* ─── Model ────────────────────────────────────────────────────────────────── */

const PROVIDER_MODELS: Record<string, string[]> = {
  google: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  vertex_ai: ['gemini-2.0-flash-001', 'gemini-2.0-flash-lite-001', 'gemini-2.5-flash-001', 'gemini-1.5-pro-001', 'gemini-1.5-flash-001'],
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google', vertex_ai: 'Vertex AI',
}

function ModelForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const provider = String(cfg.provider || 'google')
  const models = PROVIDER_MODELS[provider] ?? PROVIDER_MODELS.google
  const currentModel = String(cfg.model || models[0])

  return (
    <section className="space-y-3">
      <SectionLabel>Model</SectionLabel>

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
          value={models.includes(currentModel) ? currentModel : models[0]}
          onChange={(v) => s('model', v)}
          options={models.map((m) => ({ value: m, label: m }))}
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

      {/* Response format */}
      <Field label="Response format">
        <Select
          value={String(cfg.response_format || 'text')}
          onChange={(v) => s('response_format', v)}
          options={[{ value: 'text', label: 'Text' }, { value: 'json', label: 'JSON (parse response)' }]}
        />
      </Field>
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
  const displayModel = ADK_MODELS.includes(currentModel) ? currentModel : ADK_MODELS[0]

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
        <Select value={displayModel} onChange={(v) => s('model', v)}
          options={ADK_MODELS.map((m) => ({ value: m, label: m }))} />
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
    </section>
  )
}

/* ─── Orchestrator Agent ───────────────────────────────────────────────────── */

type InlineFunction = { name: string; description: string; parameters: string; code: string }

function OrchestratorAgentForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  const currentModel = String(cfg.model || ADK_MODELS[0])
  const displayModel = ADK_MODELS.includes(currentModel) ? currentModel : ADK_MODELS[0]

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
        Connect <strong>TOOL</strong>, <strong>DATASOURCE</strong>, <strong>REMOTE AGENT</strong>, or <strong>FUNCTION</strong> nodes to the <strong>bottom handle</strong> to give this agent access to them as tools.
      </p>

      <Field label="Model">
        <Select value={displayModel} onChange={(v) => s('model', v)}
          options={ADK_MODELS.map((m) => ({ value: m, label: m }))} />
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

      {/* Tool execution mode */}
      <Field label="Tool execution mode">
        <div className="flex gap-1">
          {(['sequential', 'parallel'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => s('tool_execution_mode', mode)}
              className={`flex-1 py-1 text-[10px] rounded-md border font-medium transition-colors ${
                (cfg.tool_execution_mode || 'sequential') === mode
                  ? mode === 'parallel'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {mode === 'parallel' ? '⚡ Parallel' : '↓ Sequential'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {(cfg.tool_execution_mode || 'sequential') === 'parallel'
            ? 'All tool calls in a turn run concurrently — faster for independent tools.'
            : 'Tool calls run one by one — safer for dependent or stateful tools.'}
        </p>
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
    </section>
  )
}

/* ─── Human Approval ───────────────────────────────────────────────────────── */

function HumanApprovalForm({ cfg, save }: FormProps) {
  const s = (k: string, v: unknown) => save({ ...cfg, [k]: v })
  return (
    <section className="space-y-3">
      <SectionLabel>Human Approval</SectionLabel>
      <Field label="Timeout (seconds)">
        <NumberInput value={Number(cfg.timeout_seconds || 3600)} onChange={(v) => s('timeout_seconds', v)} min={60} />
      </Field>
      <Field label="Approvers (comma-separated emails)">
        <TextInput value={String(cfg.approvers || '')} onChange={(v) => s('approvers', v)} placeholder="alice@example.com, bob@example.com" />
      </Field>
      <Field label="Message">
        <TextArea value={String(cfg.message || '')} onChange={(v) => s('message', v)} placeholder="Please review this request" rows={3} />
      </Field>
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

function ParallelForkForm({ cfg, save }: FormProps) {
  return (
    <section className="space-y-3">
      <SectionLabel>Parallel Fork</SectionLabel>
      <p className="text-[10px] text-gray-400">
        Draw edges from this node to each branch. All branches run in parallel.
        Connect their outputs to a <strong>Merge</strong> node.
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
      <Field label="Strategy">
        <Select
          value={String(cfg.strategy || 'all')}
          onChange={(v) => s('strategy', v)}
          options={[
            { value: 'all',   label: 'All — wait for every branch' },
            { value: 'first', label: 'First — use fastest result'  },
            { value: 'any',   label: 'Any — use first N results'   },
          ]}
        />
      </Field>
    </section>
  )
}
