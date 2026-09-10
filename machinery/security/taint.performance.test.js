const test = require('node:test')
const assert = require('node:assert')
const { Linter } = require('eslint')
const plugin = require('../..')

// `resolve()` used to fold every node through getStaticValue before doing
// anything else. getStaticValue walks the whole subtree beneath a node, and
// taintOf visits every node in a `+` chain, so the i-th link paid for i levels
// and a chain cost O(n²): 400 links took 35 ms of analysis where 100 took 2.7.
//
// The fix is one reordering, and nothing in the correctness suite would notice
// if it were undone. This is the test that would.
//
// Two chain lengths measured in the same process, so the ratio is independent
// of how fast the machine is. Linear work quadruples between 200 and 800;
// quadratic work multiplies by sixteen, and the threshold sits between them.
const SHORT = 200
const LONG = 800
const QUADRATIC_WOULD_BE = 16
const LINEAR_WOULD_BE = LONG / SHORT
const THRESHOLD = Math.sqrt(QUADRATIC_WOULD_BE * LINEAR_WOULD_BE)

test('a long concatenation chain does not cost quadratic time', () => {
  const linter = new Linter()
  const config = {
    ...plugin.configs.security,
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  }

  const { short, long } = fastestPair(
    () => linter.verify(concatChain(SHORT), config, 'chain.js'),
    () => linter.verify(concatChain(LONG), config, 'chain.js')
  )
  const ratio = long / short

  assert.ok(
    ratio < THRESHOLD,
    `chain(${LONG}) took ${ratio.toFixed(1)}x chain(${SHORT}) (${short.toFixed(2)} ms -> ${long.toFixed(2)} ms). `
    + `Linear is ~${LINEAR_WOULD_BE}x, quadratic ~${QUADRATIC_WOULD_BE}x; the threshold is ${THRESHOLD.toFixed(1)}x. `
    + 'Something reintroduced a whole-subtree walk per node — see resolve() in taint.js.'
  )
})

function concatChain(length) {
  const tail = Array.from({ length }, (unused, i) => `'segment${i}'`).join(' + ')
  return `export function handler(req, res) { db.query(req.query.id + ${tail}) }`
}

/**
 * Fastest observed run of each, measured alternately.
 *
 * The median of this made the test flaky: run the suite next to anything else
 * on the machine and a scheduler pause lands in the middle of the sample,
 * inflating one side of a ratio the whole assertion rests on. The minimum is
 * the only statistic here that noise cannot move in the wrong direction —
 * nothing makes a run finish faster than the work takes. Alternating the two
 * keeps a slow patch of wall clock from landing on one of them alone.
 */
function fastestPair(runShort, runLong, runs = 11) {
  for (let i = 0; i < 3; i++) { runShort(); runLong() }

  let short = Infinity
  let long = Infinity
  for (let i = 0; i < runs; i++) {
    short = Math.min(short, timed(runShort))
    long = Math.min(long, timed(runLong))
  }

  return { short, long }
}

function timed(run) {
  const started = process.hrtime.bigint()
  run()
  return Number(process.hrtime.bigint() - started) / 1e6
}
