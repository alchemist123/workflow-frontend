import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Save, Play, Rocket, CheckCircle, XCircle,
  Loader2, List, ArrowLeft, ChevronDown, X,
  Terminal, Copy, Check, RefreshCw, Clock, AlertCircle,
  ChevronRight,
} from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import type { WorkflowExecution } from '../../types/workflow'

interface ToolbarProps {
  onBack: () => void
}

export default function Toolbar({ onBack }: ToolbarProps) {
  const {
    currentWorkflow,
    nodes,
    isSaving, isExecuting, isDeploying,
    lastCompile, compileErrors, compileWarnings, deployResult,
    saveAndCompile, executeWorkflow, deployWorkflow,
    loadExecutions, executions,
    clearDeployResult,
    loadNodeLogs, clearNodeStatus,
  } = useWorkflowStore()

  // Read body schema from the HTTP trigger node in the canvas
  const httpTriggerCfg = (nodes.find((n) => n.type === 'HTTP_TRIGGER')?.data?.config || {}) as Record<string, unknown>
  const bodySchema = (httpTriggerCfg.body_schema as { fields?: BodyField[] } | undefined)

  const [showErrors, setShowErrors] = useState(false)
  const [showExecs, setShowExecs] = useState(false)
  const [showRunModal, setShowRunModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedExec, setSelectedExec] = useState<WorkflowExecution | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasRunning = executions.some((e) => e.status === 'running' || e.status === 'pending')

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  useEffect(() => {
    if (showExecs && hasRunning) {
      stopPoll()
      pollRef.current = setInterval(() => loadExecutions(), 2000)
    } else {
      stopPoll()
    }
    return stopPoll
  }, [showExecs, hasRunning, loadExecutions, stopPoll])

  // Keep selectedExec in sync with latest data from polling
  useEffect(() => {
    if (selectedExec) {
      const updated = executions.find((e) => e.id === selectedExec.id)
      if (updated) setSelectedExec(updated)
    }
  }, [executions])

  // Load node logs when an execution is selected and completed
  useEffect(() => {
    if (selectedExec && currentWorkflow &&
        (selectedExec.status === 'success' || selectedExec.status === 'failed')) {
      loadNodeLogs(currentWorkflow.id, selectedExec.id)
    }
  }, [selectedExec?.id, selectedExec?.status])

  const handleClosePanel = useCallback(() => {
    setShowExecs(false)
    setSelectedExec(null)
    clearNodeStatus()
  }, [clearNodeStatus])

  const handleSave = async () => {
    const result = await saveAndCompile()
    if (result && !result.is_valid) setShowErrors(true)
  }

  const handleRun = () => {
    setShowRunModal(true)
  }

  const handleRunWithPayload = async (body: Record<string, unknown>) => {
    setShowRunModal(false)
    const exec = await executeWorkflow(body)
    if (exec) {
      setShowExecs(true)
      setSelectedExec(exec)
      setTimeout(() => loadExecutions(), 800)
    }
  }

  const handleDeploy = async () => {
    clearDeployResult()
    await deployWorkflow()
  }

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canRun = lastCompile?.is_valid && !isExecuting
  const canDeploy = lastCompile?.is_valid && !isDeploying

  const statusBadge = lastCompile && (
    <button
      onClick={() => setShowErrors(!showErrors)}
      className="flex items-center gap-1 text-xs text-gray-300 hover:text-white transition-colors"
    >
      {lastCompile.is_valid
        ? <CheckCircle size={14} className="text-green-400" />
        : <XCircle size={14} className="text-red-400" />}
      <span>
        {lastCompile.is_valid
          ? compileWarnings.length > 0 ? `Valid · ${compileWarnings.length} warning(s)` : 'Valid'
          : `${compileErrors.length} error(s)`}
      </span>
      {(compileErrors.length > 0 || compileWarnings.length > 0) && <ChevronDown size={12} />}
    </button>
  )

  return (
    <>
      <div className="h-12 bg-gray-900 flex items-center px-4 gap-3 border-b border-gray-700 flex-shrink-0 relative z-40">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-xs transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Workflows</span>
        </button>

        <div className="h-4 border-l border-gray-700" />

        {/* Workflow name */}
        <span className="text-white text-sm font-medium truncate max-w-[200px]">
          {currentWorkflow?.name || 'Untitled'}
        </span>

        <div className="flex-1" />

        {/* Compile status badge */}
        {statusBadge}

        {/* Save & Compile */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-md font-medium transition-colors"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save & Compile
        </button>

        {/* Run */}
        <button
          onClick={handleRun}
          disabled={!canRun}
          title={!lastCompile?.is_valid ? 'Save & Compile first' : 'Run workflow'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-md font-medium transition-colors"
        >
          {isExecuting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Run
        </button>

        {/* Deploy */}
        <button
          onClick={handleDeploy}
          disabled={!canDeploy}
          title={!lastCompile?.is_valid ? 'Save & Compile first' : 'Build Docker image'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-md font-medium transition-colors"
        >
          {isDeploying
            ? <Loader2 size={13} className="animate-spin" />
            : <Rocket size={13} />}
          {isDeploying ? 'Building…' : 'Deploy'}
        </button>

        {/* Runs toggle */}
        <button
          onClick={() => {
            if (showExecs) {
              handleClosePanel()
            } else {
              setShowExecs(true)
              loadExecutions()
            }
          }}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
            showExecs
              ? 'bg-gray-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }`}
        >
          <List size={13} />
          Runs
          {hasRunning && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />}
        </button>

        {/* ── Compile errors / warnings dropdown ── */}
        {showErrors && (compileErrors.length > 0 || compileWarnings.length > 0) && (
          <div className="absolute top-13 right-56 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-96 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Compile Results</span>
              <button onClick={() => setShowErrors(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
            {compileErrors.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Errors — must fix to run</p>
                <ul className="space-y-1 mb-3">
                  {compileErrors.map((err, i) => (
                    <li key={i} className="text-xs text-gray-700 bg-red-50 px-2 py-1.5 rounded-md border border-red-100">
                      {err}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {compileWarnings.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">Warnings — safe to ignore</p>
                <ul className="space-y-1">
                  {compileWarnings.map((w, i) => (
                    <li key={i} className="text-xs text-gray-700 bg-amber-50 px-2 py-1.5 rounded-md border border-amber-100">
                      {w}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Runs side panel (fixed, slides in from right) ── */}
      {showExecs && (
        <div
          className="fixed top-12 right-0 bottom-0 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col"
          style={{ width: 420 }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              {selectedExec ? (
                <>
                  <button
                    onClick={() => { setSelectedExec(null); clearNodeStatus() }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mr-1"
                  >
                    <ArrowLeft size={13} /> Runs
                  </button>
                  <span className="text-gray-300">|</span>
                  <ExecStatusIcon status={selectedExec.status} />
                  <span className={`text-xs font-semibold ${statusColor(selectedExec.status)}`}>
                    {selectedExec.status}
                  </span>
                </>
              ) : (
                <>
                  <List size={14} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Runs</span>
                  {hasRunning && <Loader2 size={12} className="animate-spin text-blue-500" />}
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!selectedExec && (
                <button onClick={() => loadExecutions()} title="Refresh" className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <RefreshCw size={13} />
                </button>
              )}
              <button onClick={handleClosePanel} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Panel body */}
          {selectedExec ? (
            <ExecutionDetail exec={selectedExec} workflowId={currentWorkflow?.id || ''} />
          ) : (
            <div className="overflow-y-auto flex-1">
              {executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <List size={24} className="mb-2 opacity-40" />
                  <p className="text-xs">No executions yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {executions.map((ex) => (
                    <li
                      key={ex.id}
                      onClick={() => setSelectedExec(ex)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <ExecStatusIcon status={ex.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-gray-600">{ex.id.slice(0, 8)}…</span>
                          <span className={`text-xs font-semibold ${statusColor(ex.status)}`}>{ex.status}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {ex.started_at ? new Date(ex.started_at).toLocaleTimeString() : new Date(ex.created_at).toLocaleTimeString()}
                          {ex.finished_at && ex.started_at &&
                            ` · ${((new Date(ex.finished_at).getTime() - new Date(ex.started_at).getTime()) / 1000).toFixed(1)}s`}
                        </p>
                      </div>
                      <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Run input modal ── */}
      {showRunModal && (
        <RunInputModal
          fields={bodySchema?.fields || []}
          onRun={handleRunWithPayload}
          onCancel={() => setShowRunModal(false)}
        />
      )}

      {/* ── Deploy result modal ── */}
      {deployResult && (
        <DeployResultModal
          result={deployResult}
          onClose={clearDeployResult}
          onCopy={copyTag}
          copied={copied}
        />
      )}
    </>
  )
}

/* ─── Execution helpers ────────────────────────────────────────────────────── */

function statusColor(status: string) {
  if (status === 'success') return 'text-green-600'
  if (status === 'failed') return 'text-red-500'
  if (status === 'running') return 'text-blue-500'
  if (status === 'waiting') return 'text-amber-500'
  return 'text-gray-400'
}

function ExecStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
  if (status === 'failed') return <XCircle size={14} className="text-red-500 flex-shrink-0" />
  if (status === 'running' || status === 'pending') return <Loader2 size={14} className="animate-spin text-blue-500 flex-shrink-0" />
  if (status === 'waiting') return <Clock size={14} className="text-amber-500 flex-shrink-0" />
  return <AlertCircle size={14} className="text-gray-400 flex-shrink-0" />
}

function ExecutionDetail({ exec, workflowId: _workflowId }: { exec: WorkflowExecution; workflowId: string }) {
  const duration = exec.started_at && exec.finished_at
    ? ((new Date(exec.finished_at).getTime() - new Date(exec.started_at).getTime()) / 1000).toFixed(1) + 's'
    : exec.status === 'running' ? 'running…' : '—'

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      {/* Duration row */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
        <span className="font-mono text-[10px] text-gray-400">{exec.id.slice(0, 12)}…</span>
        <span className="text-[11px] text-gray-500">{duration}</span>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-3">
        {/* Top-level error */}
        {exec.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Execution Error</p>
            <p className="text-xs text-red-700 font-mono whitespace-pre-wrap break-words">{exec.error}</p>
          </div>
        )}

        {/* Still running */}
        {(exec.status === 'running' || exec.status === 'pending') && !exec.output && (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-400 text-xs">
            <Loader2 size={16} className="animate-spin" />
            <span>Executing workflow…</span>
          </div>
        )}

        {/* Node outputs */}
        {exec.output && Object.keys(exec.output).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Output</p>
            <div className="space-y-2">
              {Object.entries(exec.output).map(([nodeId, nodeOut]) => (
                <NodeOutputCard key={nodeId} nodeId={nodeId} output={nodeOut as Record<string, unknown>} />
              ))}
            </div>
          </div>
        )}

        {/* Trigger input */}
        {exec.trigger_payload && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Trigger Input</p>
            <pre className="bg-gray-50 rounded-lg p-3 text-[10px] font-mono text-gray-600 whitespace-pre-wrap break-words overflow-auto max-h-32">
              {JSON.stringify((exec.trigger_payload as Record<string, unknown>).body ?? exec.trigger_payload, null, 2)}
            </pre>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-[10px] text-gray-400 pt-2 space-y-0.5 border-t border-gray-100">
          {exec.started_at && <p>Started: {new Date(exec.started_at).toLocaleString()}</p>}
          {exec.finished_at && <p>Finished: {new Date(exec.finished_at).toLocaleString()}</p>}
        </div>
      </div>
    </div>
  )
}

function NodeOutputCard({ nodeId, output }: { nodeId: string; output: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(true)
  const isError = output._error === true || 'error' in output
  const shortId = nodeId.length > 28 ? nodeId.slice(0, 10) + '…' + nodeId.slice(-8) : nodeId

  const content = output.content as string | undefined
  const result = output.result as unknown
  const errorMsg = output.error as string | undefined

  return (
    <div className={`rounded-lg border text-xs overflow-hidden ${isError ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isError
            ? <XCircle size={12} className="text-red-500 flex-shrink-0" />
            : <CheckCircle size={12} className="text-green-500 flex-shrink-0" />}
          <span className="font-mono text-gray-600 truncate text-[10px]">{shortId}</span>
        </div>
        <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {!expanded && (
        <div className="px-3 pb-2 text-[11px] text-gray-600 truncate">
          {isError
            ? <span className="text-red-600">{errorMsg}</span>
            : content
              ? content.slice(0, 140) + (content.length > 140 ? '…' : '')
              : result !== undefined
                ? String(result).slice(0, 140)
                : <span className="text-gray-400 italic">empty</span>}
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
          {isError && errorMsg && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Error</p>
              <p className="text-red-700 font-mono text-[11px] whitespace-pre-wrap break-words">{errorMsg}</p>
            </div>
          )}
          {content && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Content</p>
              <p className="text-gray-800 text-[11px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
            </div>
          )}
          {result !== undefined && result !== null && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Result</p>
              <pre className="text-gray-800 text-[11px] whitespace-pre-wrap break-words">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          {!!output.usage && (
            <div className="mt-1 text-[10px] text-gray-400">
              {`Tokens: ${(output.usage as Record<string, number>).input_tokens ?? 0} in · ${(output.usage as Record<string, number>).output_tokens ?? 0} out`}
            </div>
          )}
          {Object.entries(output)
            .filter(([k]) => !['content', 'result', 'error', '_error', 'usage', 'parsed'].includes(k))
            .map(([k, v]) => (
              <div key={k} className="mt-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{k}</p>
                <pre className="text-gray-700 text-[11px] whitespace-pre-wrap break-words bg-gray-50 rounded p-1.5">
                  {typeof v === 'string' ? v : JSON.stringify(v, null, 2)}
                </pre>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

/* ─── Run input modal ─────────────────────────────────────────────────────── */

type BodyField = { name: string; type: string; description: string; required: boolean }

function RunInputModal({
  fields,
  onRun,
  onCancel,
}: {
  fields: BodyField[]
  onRun: (body: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const hasSchema = fields.length > 0
  // mode: 'form' when schema defined, 'json' always available as fallback
  const [mode, setMode] = useState<'form' | 'json'>(hasSchema ? 'form' : 'json')

  // Form values keyed by field name
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {}
    for (const f of fields) init[f.name] = f.type === 'boolean' ? false : ''
    return init
  })

  const [jsonText, setJsonText] = useState('{\n  \n}')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const validateJson = (text: string) => {
    if (!text.trim() || text.trim() === '{}') { setJsonError(null); return true }
    try { JSON.parse(text); setJsonError(null); return true }
    catch (e: unknown) { setJsonError((e as Error).message); return false }
  }

  const handleJsonChange = (v: string) => {
    setJsonText(v)
    if (v.trim()) validateJson(v)
    else setJsonError(null)
  }

  // Sync JSON editor from form values when switching to JSON mode
  const switchToJson = () => {
    if (hasSchema) {
      const body: Record<string, unknown> = {}
      for (const f of fields) {
        const v = formValues[f.name]
        if (v !== '' && v !== undefined) {
          body[f.name] = f.type === 'number' || f.type === 'integer' ? Number(v) : v
        }
      }
      setJsonText(JSON.stringify(body, null, 2))
    }
    setMode('json')
  }

  const handleRun = () => {
    let body: Record<string, unknown> = {}
    if (mode === 'form') {
      for (const f of fields) {
        const v = formValues[f.name]
        if (f.required || (v !== '' && v !== false)) {
          body[f.name] = f.type === 'number' || f.type === 'integer' ? Number(v) : v
        }
      }
    } else {
      if (jsonText.trim() && jsonText.trim() !== '{}') {
        if (!validateJson(jsonText)) return
        body = JSON.parse(jsonText)
      }
    }
    onRun(body)
  }

  const handleJsonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun()
    if (e.key === 'Escape') onCancel()
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.target as HTMLTextAreaElement
      const s = el.selectionStart, end = el.selectionEnd
      const next = jsonText.substring(0, s) + '  ' + jsonText.substring(end)
      setJsonText(next)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2 })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-green-600">
          <div className="flex items-center gap-2 text-white">
            <Play size={16} />
            <span className="font-semibold text-sm">Run Workflow</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode toggle — only show when schema exists */}
            {hasSchema && (
              <button
                onClick={() => mode === 'form' ? switchToJson() : setMode('form')}
                className="text-white/70 hover:text-white text-[10px] font-mono border border-white/30 rounded px-1.5 py-0.5 transition-colors"
              >
                {mode === 'form' ? '{ }' : 'Form'}
              </button>
            )}
            <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* ── Schema-driven form ── */}
          {mode === 'form' && hasSchema && (
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.name}>
                  <div className="flex items-baseline gap-1 mb-1">
                    <label className="text-xs font-semibold text-gray-700 font-mono">{f.name}</label>
                    <span className="text-[10px] text-gray-400">{f.type}</span>
                    {f.required && <span className="text-[10px] text-red-400 font-semibold">*</span>}
                  </div>
                  {f.description && (
                    <p className="text-[10px] text-gray-400 mb-1">{f.description}</p>
                  )}
                  {f.type === 'boolean' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setFormValues((v) => ({ ...v, [f.name]: !v[f.name] }))}
                        className={`w-9 h-5 rounded-full transition-colors relative ${formValues[f.name] ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formValues[f.name] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                      <span className="text-xs text-gray-600">{formValues[f.name] ? 'true' : 'false'}</span>
                    </label>
                  ) : f.type === 'text' ? (
                    <textarea
                      value={String(formValues[f.name] || '')}
                      onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      rows={3}
                      placeholder={`Enter ${f.name}…`}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  ) : f.type === 'number' || f.type === 'integer' ? (
                    <input
                      type="number"
                      value={String(formValues[f.name] || '')}
                      onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      placeholder={`Enter ${f.name}…`}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(formValues[f.name] || '')}
                      onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      placeholder={`Enter ${f.name}…`}
                      autoFocus={fields.indexOf(f) === 0}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Raw JSON editor ── */}
          {mode === 'json' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Request body (JSON)</p>
                <span className="text-[10px] text-gray-400">⌘↵ to run</span>
              </div>
              <textarea
                autoFocus
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                onKeyDown={handleJsonKeyDown}
                rows={9}
                spellCheck={false}
                className={`w-full font-mono text-xs bg-gray-950 text-gray-100 rounded-xl px-4 py-3 resize-none outline-none border-2 transition-colors ${
                  jsonError ? 'border-red-500' : 'border-transparent focus:border-green-500'
                }`}
                placeholder={'{\n  "message": "hello"\n}'}
              />
              {jsonError && <p className="mt-1 text-[11px] text-red-500 font-mono">{jsonError}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRun}
              disabled={mode === 'json' && !!jsonError}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-lg font-semibold transition-colors"
            >
              <Play size={12} />
              Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Deploy result modal ──────────────────────────────────────────────────── */

interface DeployResult {
  success: boolean
  image_tag?: string
  error?: string
  logs?: string[]
  compose_command?: string
  runner_dir?: string
  docker_available?: boolean
  container_id?: string
  service_url?: string
  service_port?: number
  container_error?: string
}

function DeployResultModal({
  result,
  onClose,
  onCopy,
  copied,
}: {
  result: DeployResult
  onClose: () => void
  onCopy: (tag: string) => void
  copied: boolean
}) {
  const [showLogs, setShowLogs] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${
          result.success
            ? result.docker_available === false
              ? 'bg-amber-500'
              : result.service_url
                ? 'bg-green-600'
                : 'bg-purple-600'
            : 'bg-red-500'
        }`}>
          <div className="flex items-center gap-2 text-white">
            {result.success
              ? result.docker_available === false
                ? <><Rocket size={18} /><span className="font-semibold">Package ready — build manually</span></>
                : result.service_url
                  ? <><CheckCircle size={18} /><span className="font-semibold">Container running</span></>
                  : <><Rocket size={18} /><span className="font-semibold">Image built</span></>
              : <><XCircle size={18} /><span className="font-semibold">Deploy failed</span></>}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {result.success && result.docker_available === false && result.runner_dir && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <p className="text-amber-800 text-xs font-medium">
                  Docker daemon not reachable from the API server. Package is ready — one command to start:
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Package location</p>
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                  <span className="text-blue-300 font-mono text-xs flex-1 break-all">{result.runner_dir}</span>
                  <button onClick={() => onCopy(result.runner_dir!)} className="text-gray-400 hover:text-white flex-shrink-0">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              {result.compose_command && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start container</p>
                  <div className="flex items-start gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                    <Terminal size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-green-400 font-mono text-xs flex-1 break-all">{result.compose_command}</span>
                    <button onClick={() => onCopy(result.compose_command!)} className="text-gray-400 hover:text-white flex-shrink-0">
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {result.success && result.service_url && result.docker_available !== false && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Live Service</p>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <a href={result.service_url + '/docs'} target="_blank" rel="noreferrer"
                   className="text-green-700 font-mono text-sm flex-1 truncate hover:underline">
                  {result.service_url}
                </a>
                <button onClick={() => onCopy(result.service_url!)} className="text-green-500 hover:text-green-700 flex-shrink-0">
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Container: {result.container_id} ·{' '}
                <a href={result.service_url + '/docs'} target="_blank" rel="noreferrer" className="underline">Open API docs →</a>
              </p>
            </div>
          )}

          {result.success && result.image_tag && result.docker_available !== false && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Docker Image</p>
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                <span className="text-green-400 font-mono text-sm flex-1 truncate">{result.image_tag}</span>
                <button onClick={() => onCopy(result.image_tag!)} className="text-gray-400 hover:text-white flex-shrink-0">
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {!result.success && result.error && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Error</p>
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <p className="text-red-700 text-xs font-mono whitespace-pre-wrap">{result.error}</p>
              </div>
            </div>
          )}

          {result.logs && result.logs.length > 0 && (
            <div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                <Terminal size={13} />
                {showLogs ? 'Hide' : 'Show'} build logs ({result.logs.length} lines)
              </button>
              {showLogs && (
                <div className="mt-2 bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {result.logs.map((line, i) => (
                    <p key={i} className="text-gray-300 font-mono text-[10px] leading-relaxed">{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
