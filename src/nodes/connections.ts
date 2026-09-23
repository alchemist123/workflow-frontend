/**
 * Judging a connection on the canvas, from the rules the backend published.
 *
 * Deliberately a lookup and nothing more. The rules themselves live in
 * `backend/app/compiler/connection_rules.py`, where a test proves them
 * identical to what the compiler enforces over all 882 type/handle
 * combinations. Reimplementing them here would put the only untested copy of
 * the rules in the one part of this repo with no test runner — and a canvas
 * that refuses an edge the compiler would have accepted stops real work with
 * no way around it.
 *
 * Every function tolerates `rules` being null: until the backend answers, the
 * canvas simply does not judge anything, which is how it behaved before.
 */

import type { ConnectionRules } from '../api/client'

export const TOOLS_HANDLE = 'tools'
export const INPUT_HANDLE = 'input'

/** The fallback branch; the compiler takes it when no named branch matched. */
const DEFAULT_ROUTE = 'default'

export interface Refusal {
  code: string
  message: string
}

/**
 * The source handles a node of this type actually has.
 *
 * CONDITION and PARALLEL_FORK name their own branches in config, so theirs are
 * not a fixed list. Mirrors `output_handles_for` in the backend module.
 */
export function outputHandles(
  rules: ConnectionRules | null,
  nodeType: string,
  config?: Record<string, unknown>,
): string[] {
  const type = rules?.types[nodeType]
  if (!type || !type.allows_outbound) return []

  if (nodeType === 'CONDITION' || nodeType === 'PARALLEL_FORK') {
    const branches = (config?.branches as Array<string | { name?: string }>) || []
    const named = branches
      .map((b) => (typeof b === 'string' ? b : b?.name || '').trim())
      .filter(Boolean)
    if (named.length) return [...new Set([...named, DEFAULT_ROUTE])]
  }
  return type.output_handles
}

/**
 * `null` when the edge is fine, otherwise why it is not.
 *
 * A lookup, not a reimplementation. The backend precomputed the verdict for
 * every source/target/handle combination by asking the compiler's own rule, so
 * anything absent from `refusals` is allowed. The browser therefore holds the
 * rules' *answers* and none of their logic — which is what makes it impossible
 * for the canvas to disagree with the compiler.
 *
 * The one exception is the handle check, which cannot be precomputed because
 * it depends on the branch names in a node's config.
 */
export function judgeConnection(
  rules: ConnectionRules | null,
  sourceType: string,
  sourceHandle: string | null | undefined,
  targetType: string,
  targetHandle: string | null | undefined,
  sourceConfig?: Record<string, unknown>,
): Refusal | null {
  if (!rules) return null
  // An unrecognised type is its own error, reported once against the node.
  // Refusing its edges as well would bury that under noise.
  if (!rules.types[sourceType] || !rules.types[targetType]) return null

  const handle = sourceHandle || 'output'
  const landing = targetHandle || rules.input_handle

  const code = rules.refusals[`${sourceType}>${targetType}@${landing}`]
  if (code) return refusal(rules, code, sourceType, targetType, handle)

  const handles = outputHandles(rules, sourceType, sourceConfig)
  if (handles.length && !handles.includes(handle)) {
    return refusal(rules, 'edge.unknown_handle', sourceType, targetType, handle)
  }
  return null
}

function refusal(
  rules: ConnectionRules,
  code: string,
  sourceType: string,
  targetType: string,
  handle: string,
): Refusal {
  const template = rules.messages[code] || 'This connection is not allowed.'
  const message = template
    .replace('{source}', label(sourceType))
    .replace('{target}', label(targetType))
    .replace('{handle}', handle)
  return { code, message }
}

/**
 * Every node type this handle may legally reach, and the socket it lands on.
 *
 * This is what the suggestion menu offers, so the menu cannot propose
 * something that would immediately be marked wrong.
 */
export function targetsFor(
  rules: ConnectionRules | null,
  sourceType: string,
  sourceHandle?: string | null,
  sourceConfig?: Record<string, unknown>,
): Record<string, string[]> {
  if (!rules) return {}
  const offered = rules.types[sourceType]?.connects_to || {}

  // `connects_to` was computed without a handle, so re-check the one in use —
  // it is the only part of the verdict that depends on it.
  const handles = outputHandles(rules, sourceType, sourceConfig)
  const handle = sourceHandle || 'output'
  if (handles.length && !handles.includes(handle)) return {}
  return offered
}

/** `SEQUENTIAL_AGENT` → `Sequential Agent`, for a message someone has to read. */
export function label(nodeType: string): string {
  return nodeType
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}
