import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Save, Play, Package, CheckCircle, XCircle,
  Loader2, List, ArrowLeft, ChevronDown, X, Search,
  Terminal, Copy, Check, RefreshCw, Clock, AlertCircle,
  ChevronRight, FolderOpen, UserCheck,
} from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import type { RunMode, TestRunOutput, WorkflowExecution } from '../../types/workflow'
import { workflowApi, type TaskLookup } from '../../api/client'

interface ToolbarProps {
  onBack: () => void
}

export default function Toolbar({ onBack }: ToolbarProps) {
  const {
    currentWorkflow,
    nodes,
    isSaving, isExecuting, isPackaging,
    lastCompile, compileErrors, compileWarnings, packageResult,
    saveAndCompile, testWorkflow, packageWorkflow,
    runMode, setRunMode,
    loadExecutions, executions,
    clearPackageResult,
    loadNodeLogs, clearNodeStatus,
  } = useWorkflowStore()

  // The payload contract comes from the A2A_START node — it is what the packaged
  // agent advertises, so the Run panel and real callers see the same fields.
  const startCfg = (nodes.find((n) => n.type === 'A2A_START')?.data?.config || {}) as Record<string, unknown>
  const payloadSchema = (startCfg.payload_schema as { fields?: PayloadField[] } | undefined)
  const payloadFields = startCfg.input_mode === 'text' ? [] : (payloadSchema?.fields || [])

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

  const handleRunWithPayload = async (body: Record<string, unknown>, mode: RunMode) => {
    setShowRunModal(false)
    setRunMode(mode)
    const exec = await testWorkflow(body, mode)
    if (exec) {
      setShowExecs(true)
      setSelectedExec(exec)
      setTimeout(() => loadExecutions(), 800)
    }
  }

  const handlePackage = async () => {
    clearPackageResult()
    await packageWorkflow()
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canRun = lastCompile?.is_valid && !isExecuting
  const canPackage = lastCompile?.is_valid && !isPackaging

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

        {/* Package */}
        <button
          onClick={handlePackage}
          disabled={!canPackage}
          title={!lastCompile?.is_valid ? 'Save & Compile first' : 'Generate standalone project'}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-md font-medium transition-colors"
        >
          {isPackaging
            ? <Loader2 size={13} className="animate-spin" />
            : <Package size={13} />}
          {isPackaging ? 'Packaging…' : 'Package'}
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
            <ExecutionDetail exec={selectedExec} workflowId={currentWorkflow?.id || ''} onCopy={copyText} />
          ) : (
            <div className="overflow-y-auto flex-1">
              <TaskLookupBox
                workflowId={currentWorkflow?.id || ''}
                versionId={lastCompile?.version_id || ''}
              />
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
                        <TaskIdLine exec={ex} onCopy={copyText} />
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
          fields={payloadFields}
          mode={runMode}
          onRun={handleRunWithPayload}
          onCancel={() => setShowRunModal(false)}
        />
      )}

      {/* ── Package result modal ── */}
      {packageResult && (
        <PackageResultModal
          result={packageResult}
          onClose={clearPackageResult}
          onCopy={copyText}
          copied={copied}
        />
      )}
    </>
  )
}



/**
 * Check an A2A task by id, without running anything.
 *
 * The id is the handle a caller keeps after submitting a workflow in task
 * mode, and it outlives the run that created it — the package stores its tasks
 * on disk. So this answers the question the Runs list cannot: "what happened
 * to the task I submitted?", including one submitted from outside this UI
 * entirely, as long as it shares the package's store.
 *
 * Read-only. A run parked on a human node shows as `input-required` here and
 * stays parked; answering it is the Approve / Reject buttons on the run.
 */
function TaskLookupBox({ workflowId, versionId }: { workflowId: string; versionId: string }) {
  const [open, setOpen] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [checking, setChecking] = useState(false)
  const [found, setFound] = useState<TaskLookup | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const check = async () => {
    const id = taskId.trim()
    if (!id) return
    setChecking(true)
    setProblem(null)
    setFound(null)
    try {
      setFound(await workflowApi.getTask(workflowId, versionId, id))
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setProblem(detail || 'The task could not be checked.')
    } finally {
      setChecking(false)
    }
  }

  if (!versionId) return null

  return (
    <div className="border-b border-gray-100 bg-gray-50/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Search size={11} />
        Check a task by id
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-[10px] text-gray-400">
            Any task this workflow&rsquo;s package has seen, including one
            submitted from outside this UI. Nothing is run and nothing changes.
          </p>
          <div className="flex gap-1">
            <input
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') check() }}
              placeholder="task id"
              className="flex-1 min-w-0 font-mono text-[10px] px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={check}
              disabled={!taskId.trim() || checking}
              className="px-2.5 py-1.5 text-[10px] rounded border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1 flex-shrink-0"
            >
              {checking ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
              Check
            </button>
          </div>

          {problem && <p className="text-[10px] text-red-500">{problem}</p>}

          {found && !found.found && (
            <p className="text-[10px] text-amber-600">
              No such task in this workflow&rsquo;s package. A task id from a
              different workflow, or from before this version was last
              packaged, will not be here.
            </p>
          )}

          {found?.found && (
            <div className="bg-white border border-gray-200 rounded-md p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">State</span>
                <span className={`text-[11px] font-semibold ${a2aStateColor(found.state)}`}>
                  {found.state}
                </span>
              </div>
              {found.input_required && (
                <p className="text-[10px] text-amber-600">
                  Waiting on a person: &ldquo;{found.input_required.prompt}&rdquo;
                  — open the run to answer it.
                </p>
              )}
              {found.error && (
                <p className="text-[10px] text-red-600 font-mono break-words">{found.error}</p>
              )}
              {found.result !== null && found.result !== undefined && (
                <pre className="text-[10px] font-mono text-gray-600 bg-gray-50 rounded p-1.5 overflow-x-auto max-h-40">
                  {JSON.stringify(found.result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * The A2A task id, on a run in the list.
 *
 * It only exists for a run the platform drove over A2A, and it is the thing
 * you paste into a `tasks/get` call — so it is worth showing without opening
 * the run, and worth being one click to copy.
 *
 * Both invocation modes produce one: a blocking `message/send` creates a task
 * too, it simply waits for it. The poll count is what distinguishes them, so
 * it goes here rather than the mode name alone.
 */
function TaskIdLine({ exec, onCopy }: { exec: WorkflowExecution; onCopy: (t: string) => void }) {
  const output = exec.output as unknown as TestRunOutput | null
  const taskId = output?.a2a?.task_id
  if (!taskId) return null

  const polls = output?.a2a?.polls ?? 0
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCopy(taskId) }}
      title={`Copy task id — ${taskId}`}
      className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-600 group max-w-full"
    >
      <span className="font-mono truncate">task {taskId.slice(0, 8)}…</span>
      {output?.a2a?.mode === 'task' && (
        <span className="flex-shrink-0">· {polls} poll{polls === 1 ? '' : 's'}</span>
      )}
      <Copy size={9} className="flex-shrink-0 text-gray-300 group-hover:text-blue-500" />
    </button>
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

/**
 * Answer a run parked on a HUMAN_APPROVAL or HUMAN_INPUT node.
 *
 * One panel for both, because the task tells it which it is: an approval
 * advertises an `approved` field in its schema, an input request does not. So
 * this renders two decision buttons or one Submit, and the input fields come
 * from the schema either way — nothing about the workflow is hardcoded here.
 *
 * Answering resumes the parked task rather than replaying the workflow: the
 * package keeps the A2A task and the ADK session on disk, so the run carries
 * on from the node that paused.
 */
function ApprovalPanel({ exec, pending }: {
  exec: WorkflowExecution
  pending: NonNullable<TestRunOutput['input_required']>
}) {
  const answerExecution = useWorkflowStore((s) => s.answerExecution)
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'approved' | 'rejected' | 'submitted' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const properties = pending.response_schema?.properties || {}
  const extras = Object.entries(properties).filter(([name]) => name !== 'approved')
  // A decision if the task asks for one; otherwise it just wants values.
  const isDecision = 'approved' in properties
  // The node enforces these and asks again if they are missing, so checking
  // here only saves the user a round trip.
  const required = pending.payload?.required_fields || []

  const collect = () => {
    const response: Record<string, unknown> = {}
    for (const [name, spec] of extras) {
      const raw = values[name]
      if (raw === undefined || raw === '') continue
      response[name] = spec.type === 'number' || spec.type === 'integer' ? Number(raw) : raw
    }
    return response
  }

  const submit = async (approved: boolean | null) => {
    const response = collect()
    // Only an approval needs the required values; a rejection never does.
    if (approved !== false) {
      const missing = required.filter((name) => response[name] === undefined)
      if (missing.length) {
        setError(`Still needed: ${missing.join(', ')}`)
        return
      }
    }
    setBusy(approved === null ? 'submitted' : approved ? 'approved' : 'rejected')
    setError(null)
    if (approved !== null) response.approved = approved
    const updated = await answerExecution(exec.id, response)
    setBusy(null)
    if (!updated) setError('The answer could not be submitted.')
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <UserCheck size={13} className="text-purple-600 flex-shrink-0" />
        <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
          {isDecision ? 'Waiting for a decision' : 'Waiting for input'}
        </p>
      </div>

      <p className="text-xs text-gray-800 leading-relaxed">{pending.prompt}</p>

      {!!pending.payload?.assignees?.length && (
        <p className="text-[10px] text-gray-500">
          Assigned to {pending.payload.assignees.join(', ')}
        </p>
      )}

      {extras.map(([name, spec]) => (
        <div key={name}>
          <label className="text-[10px] font-semibold text-gray-600 font-mono">
            {name}
            {required.includes(name) && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {spec.description && (
            <p className="text-[10px] text-gray-400 mb-1">{spec.description}</p>
          )}
          <input
            value={values[name] || ''}
            onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
            type={spec.type === 'number' || spec.type === 'integer' ? 'number' : 'text'}
            placeholder={name === 'comment' ? 'Optional note' : `Enter ${name}…`}
            className="w-full text-xs px-2 py-1.5 border border-purple-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>
      ))}

      {error && <p className="text-[10px] text-red-600">{error}</p>}

      {isDecision ? (
        <div className="flex gap-2">
          <button
            onClick={() => submit(true)}
            disabled={busy !== null}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white transition-colors"
          >
            {busy === 'approved' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Approve
          </button>
          <button
            onClick={() => submit(false)}
            disabled={busy !== null}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-md bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {busy === 'rejected' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Reject
          </button>
        </div>
      ) : (
        <button
          onClick={() => submit(null)}
          disabled={busy !== null}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors"
        >
          {busy === 'submitted' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Submit
        </button>
      )}

      <p className="text-[10px] text-gray-400 leading-relaxed">
        The run carries on from this step. Nothing before it runs again.
      </p>
    </div>
  )
}

function ExecutionDetail(
  { exec, workflowId: _workflowId, onCopy }:
  { exec: WorkflowExecution; workflowId: string; onCopy: (t: string) => void },
) {
  // A test run records an A2A envelope; older engine runs recorded a map of
  // node id -> output. The `a2a` key tells them apart.
  const output = exec.output as unknown as TestRunOutput | null
  const testRun = output && output.a2a ? output : null

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
            <span>Running the packaged agent…</span>
          </div>
        )}

        {/* Parked on a human. Shown first: it is the only thing on this panel
            the reader can act on. */}
        {testRun?.input_required && exec.status === 'waiting' && (
          <ApprovalPanel exec={exec} pending={testRun.input_required} />
        )}

        {/* A2A task lifecycle — a test run drives the package over A2A, so this
            is what a real caller would have seen. */}
        {testRun && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              A2A task
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-200">
              <DetailRow label="State" value={
                <span className={`font-semibold ${a2aStateColor(testRun.a2a.state)}`}>
                  {testRun.a2a.state}
                </span>
              } />
              <DetailRow label="Invocation" value={
                testRun.a2a.mode === 'task'
                  ? `task · ${testRun.a2a.polls} poll${testRun.a2a.polls === 1 ? '' : 's'}`
                  : 'message (blocking)'
              } />
              {testRun.a2a.task_id && (
                <DetailRow label="Task id" value={
                  <button
                    onClick={() => onCopy(testRun.a2a.task_id as string)}
                    title="Copy — this is what tasks/get takes"
                    className="font-mono text-[10px] break-all text-left hover:text-blue-600 flex items-start gap-1 group"
                  >
                    <span>{testRun.a2a.task_id}</span>
                    <Copy size={10} className="mt-0.5 flex-shrink-0 text-gray-300 group-hover:text-blue-500" />
                  </button>
                } />
              )}
              {!!testRun.duration_ms && (
                <DetailRow label="Took" value={`${(testRun.duration_ms / 1000).toFixed(2)}s`} />
              )}
            </div>
          </div>
        )}

        {/* Result — decoded from the task's result artifact */}
        {testRun && testRun.result !== null && testRun.result !== undefined && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Result</p>
            <pre className="bg-gray-900 rounded-lg p-3 text-[10px] font-mono text-green-300 whitespace-pre-wrap break-words overflow-auto max-h-64">
              {JSON.stringify(testRun.result, null, 2)}
            </pre>
          </div>
        )}

        {testRun && testRun.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
              Build warnings
            </p>
            <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
              {testRun.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Node outputs — the shape older engine runs recorded */}
        {!testRun && exec.output && Object.keys(exec.output).length > 0 && (
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
              {JSON.stringify(
                (exec.trigger_payload as Record<string, unknown>).payload
                  ?? (exec.trigger_payload as Record<string, unknown>).body
                  ?? exec.trigger_payload,
                null,
                2,
              )}
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-[11px] text-gray-700 text-right min-w-0">{value}</span>
    </div>
  )
}

function a2aStateColor(state: string): string {
  if (state === 'completed') return 'text-green-600'
  if (state === 'failed' || state === 'rejected') return 'text-red-600'
  if (state === 'canceled') return 'text-gray-500'
  return 'text-blue-600'
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

type PayloadField = { name: string; type: string; description: string; required: boolean }

function RunInputModal({
  fields,
  mode: initialMode,
  onRun,
  onCancel,
}: {
  fields: PayloadField[]
  mode: RunMode
  onRun: (body: Record<string, unknown>, mode: RunMode) => void
  onCancel: () => void
}) {
  // How the packaged agent is invoked. Distinct from `mode` below, which is
  // whether this modal shows a form or a raw JSON editor.
  const [invokeMode, setInvokeMode] = useState<RunMode>(initialMode)
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
  // Per-field problems from the form's own type coercion, keyed by field name.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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
      // Coerce each value to the type the field declares. Only number and
      // integer used to be converted, so an `array` or `object` field was sent
      // as the raw string — a workflow looping over `items` then received
      // "[1, 2, 3]" instead of a list, iterated nothing, and still reported
      // success.
      const bad: Record<string, string> = {}
      for (const f of fields) {
        const v = formValues[f.name]
        if (!f.required && (v === '' || v === false)) continue

        if (f.type === 'number' || f.type === 'integer') {
          body[f.name] = Number(v)
        } else if (f.type === 'array' || f.type === 'object') {
          const text = String(v ?? '').trim()
          if (!text) {
            body[f.name] = f.type === 'array' ? [] : {}
            continue
          }
          try {
            const parsed = JSON.parse(text)
            const shapeOk = f.type === 'array' ? Array.isArray(parsed)
              : parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            if (!shapeOk) {
              bad[f.name] = `Expected ${f.type === 'array' ? 'a JSON array' : 'a JSON object'}.`
              continue
            }
            body[f.name] = parsed
          } catch {
            bad[f.name] = `Not valid JSON — write ${f.type === 'array' ? '[1, 2, 3]' : '{"key": "value"}'}.`
          }
        } else {
          body[f.name] = v
        }
      }
      setFieldErrors(bad)
      if (Object.keys(bad).length > 0) return
    } else {
      if (jsonText.trim() && jsonText.trim() !== '{}') {
        if (!validateJson(jsonText)) return
        body = JSON.parse(jsonText)
      }
    }
    onRun(body, invokeMode)
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

          {/* ── How to invoke the agent ── */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Invocation
            </p>
            <div className="flex gap-1.5">
              {([
                { value: 'message', label: 'Message', hint: 'Wait for the answer (blocking message/send)' },
                { value: 'task', label: 'Task', hint: 'Submit, then poll tasks/get for the result' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setInvokeMode(option.value)}
                  title={option.hint}
                  className={`flex-1 text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                    invokeMode === option.value
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="font-semibold block">{option.label}</span>
                  <span className="text-[10px] leading-tight block mt-0.5 opacity-80">
                    {option.value === 'message' ? 'Wait for the answer' : 'Submit, then poll'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Both drive the packaged agent over A2A. Task mode is what a caller
              uses when a workflow is too slow to hold a connection open for.
            </p>
          </div>

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
                  ) : f.type === 'array' || f.type === 'object' ? (
                    <textarea
                      value={String(formValues[f.name] || '')}
                      onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      rows={2}
                      placeholder={f.type === 'array' ? '[1, 2, 3]' : '{"key": "value"}'}
                      className={`w-full text-xs font-mono px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 ${
                        fieldErrors[f.name]
                          ? 'border-red-300 focus:ring-red-400 bg-red-50'
                          : 'border-gray-200 focus:ring-green-400'
                      }`}
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
                  {fieldErrors[f.name] && (
                    <p className="text-[10px] text-red-500 mt-1">{fieldErrors[f.name]}</p>
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

/* ─── Package result modal ─────────────────────────────────────────────────── */

interface PackageResult {
  package_dir: string
  compose_command: string
  service_url: string
  service_port: number
  files: string[]
  error?: string
}

function PackageResultModal({
  result,
  onClose,
  onCopy,
  copied,
}: {
  result: PackageResult
  onClose: () => void
  onCopy: (text: string) => void
  copied: boolean
}) {
  const hasError = !!result.error
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 ${hasError ? 'bg-red-500' : 'bg-purple-600'}`}>
          <div className="flex items-center gap-2 text-white">
            {hasError
              ? <><XCircle size={18} /><span className="font-semibold">Packaging failed</span></>
              : <><Package size={18} /><span className="font-semibold">Package ready</span></>}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-red-700 text-xs font-mono whitespace-pre-wrap">{result.error}</p>
            </div>
          )}

          {!hasError && (
            <>
              {/* Directory */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FolderOpen size={11} /> Package directory
                </p>
                <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                  <span className="text-blue-300 font-mono text-xs flex-1 break-all">{result.package_dir}</span>
                  <button onClick={() => onCopy(result.package_dir)} className="text-gray-400 hover:text-white flex-shrink-0" title="Copy path">
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Start command */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Terminal size={11} /> Start the workflow
                </p>
                <div className="flex items-start gap-2 bg-gray-900 rounded-lg px-3 py-2.5">
                  <Terminal size={11} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-green-400 font-mono text-xs flex-1 break-all">{result.compose_command}</span>
                  <button onClick={() => onCopy(result.compose_command)} className="text-gray-400 hover:text-white flex-shrink-0" title="Copy command">
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Service URL */}
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                <span className="text-[10px] text-purple-500 font-medium">Once running:</span>
                <a href={result.service_url + '/docs'} target="_blank" rel="noreferrer"
                   className="text-purple-700 font-mono text-xs hover:underline flex-1">
                  {result.service_url}/docs
                </a>
              </div>

              {/* Files list */}
              {result.files.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Generated files</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.files.map((f) => (
                      <span key={f} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-[11px] text-blue-700 space-y-1">
                <p className="font-semibold">This package is fully standalone</p>
                <p>No dependency on this backend. Copy the directory to any machine, fill in <code className="bg-blue-100 px-1 rounded">.env</code>, and run the compose command.</p>
              </div>
            </>
          )}

          <div className="flex justify-end pt-1">
            <button onClick={onClose} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
