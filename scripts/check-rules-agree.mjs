/**
 * Does the browser's judgement of a connection match the compiler's?
 *
 *     node scripts/check-rules-agree.mjs          # needs the backend running
 *
 * `src/nodes/connections.ts` is a lookup over a table the backend precomputes,
 * so in principle it cannot disagree. This proves it, over every ordered pair
 * of node types on both sockets, and is the only automated check that covers
 * that file — the frontend has no test runner.
 *
 * Run it after changing `connections.ts`, `connection_rules.py`, or any node
 * definition's flags. The backend half is covered by
 * `backend/tests/test_connection_rules.py`, which proves the same table is
 * exactly what `validate_semantics` enforces; this closes the loop to the
 * browser.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API = process.env.API ?? 'http://localhost:8001/api/v1'

const scratch = mkdtempSync(join(tmpdir(), 'rules-'))
try {
  // Bundle the module under test the same way Vite would.
  const bundle = join(scratch, 'connections.cjs')
  execFileSync('npx', [
    'esbuild', 'src/nodes/connections.ts',
    '--bundle', '--format=cjs', '--log-level=error', `--outfile=${bundle}`,
  ], { stdio: 'inherit' })

  // A CJS bundle imported from ESM puts its exports under `.default`.
  const loaded = await import(`file://${bundle}`)
  const { judgeConnection } = loaded.default ?? loaded
  const rules = await fetch(`${API}/workflows/connection-rules`).then((r) => r.json())

  const types = Object.keys(rules.types).sort()
  const disagreements = []
  let checked = 0
  let refused = 0

  for (const source of types) {
    for (const target of types) {
      for (const handle of [rules.input_handle, rules.tools_handle]) {
        checked += 1
        const mine = judgeConnection(rules, source, 'output', target, handle)
        // The backend's own verdict for this combination, as published.
        const theirs = rules.refusals[`${source}>${target}@${handle}`] ?? null
        if ((mine?.code ?? null) !== theirs) {
          disagreements.push(
            `${source} --${handle}--> ${target}: browser ${mine?.code ?? 'OK'}, compiler ${theirs ?? 'OK'}`,
          )
        }
        if (theirs) refused += 1
      }
    }
  }

  if (disagreements.length) {
    console.error(`\n${disagreements.length} disagreement(s):`)
    for (const line of disagreements.slice(0, 20)) console.error(`  ${line}`)
    process.exit(1)
  }

  // A check that agrees about nothing would also report zero disagreements.
  if (refused === 0) {
    console.error('No refusals in the table at all — the check proves nothing.')
    process.exit(1)
  }

  console.log(`The browser and the compiler agree on all ${checked} combinations`)
  console.log(`(${refused} of them refusals, so the check has something to be wrong about).`)
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
