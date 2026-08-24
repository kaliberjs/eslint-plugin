const test = require('node:test')
const assert = require('node:assert')
const { describe } = require('node:test')
const { Linter } = require('eslint')
const { analyze } = require('./taint')
const { DEFAULTS } = require('./finding')

const linter = new Linter()

/**
 * `reachableSinksOf` is the mirror image of the return-value summarization
 * covered in taint.test.js / taint.crossfile.test.js: instead of asking
 * "what taint does calling this function hand back", it asks "does calling
 * this function, with these tainted arguments, reach a sink INSIDE its own
 * body" — the shape every route-handler-delegates-to-a-data-layer call
 * needs, and which return-value summarization alone cannot see.
 *
 * Same fixture tree as taint.crossfile.test.js; sinkHelpers.js and
 * sinkHelperCaller.js add functions that call a sink directly rather than
 * just returning tainted data.
 */
const FIXTURES = `${__dirname}/fixtures/interprocedural/src`
const CALLER = `${FIXTURES}/caller.js`

function reachableSinkLabels(code, filename = CALLER) {
  const found = []

  linter.verify(code, {
    plugins: {
      probe: {
        rules: {
          collect: {
            create(context) {
              const analysis = analyze(context.sourceCode, DEFAULTS, context.filename)
              return {
                CallExpression(node) {
                  for (const reachable of analysis.reachableSinksOf(node, 'sql')) found.push(reachable)
                },
              }
            },
          },
        },
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'probe/collect': 'error' },
  }, filename)

  return found
}

describe('reachable sinks through a called function', () => {
  test('a same-file function containing a sink is reachable in one hop', () => {
    const found = reachableSinkLabels(`
      function queryUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id) }
      function handler(req) { queryUser(req.params.id) }
    `)
    assert.strictEqual(found.length, 1)
    assert.strictEqual(found[0].sinkLabel, 'db.query()')
  })

  test('a same-file transitive chain (A calls B, B contains the sink) resolves', () => {
    const found = reachableSinkLabels(`
      function inner(x) { return db.query(x) }
      function outer(x) { return inner(x) }
      function handler(req) { outer(req.params.id) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('an untainted argument stays quiet', () => {
    const found = reachableSinkLabels(`
      function queryUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id) }
      function handler() { queryUser('literal') }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('same-file mutual recursion does not hang and resolves quietly', () => {
    const found = reachableSinkLabels(`
      function a(x) { return b(x) }
      function b(x) { return a(x) }
      function handler(req) { a(req.params.id) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('a cross-file function containing a sink is reachable', () => {
    const found = reachableSinkLabels(`
      import { queryUser } from './sinkHelpers'
      function handler(req) { queryUser(req.params.id) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a cross-file chain (file A calls file B, B contains the sink) resolves', () => {
    const found = reachableSinkLabels(`
      import { wrapsQueryUser } from './sinkHelpers'
      function handler(req) { wrapsQueryUser(req.params.id) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a two-file-hop chain (caller -> file A -> file B with the sink) resolves', () => {
    const found = reachableSinkLabels(`
      import { handleUserQuery } from './sinkHelperCaller'
      function handler(req) { handleUserQuery(req.params.id) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a cross-file object-destructured param ({ userId }) is a documented miss, same as return-value summarization', () => {
    // bindParamFromTaint only crosses the file boundary with a whole-object
    // taint, by design (summarizeCall's doc comment: "only its taint value
    // crosses the file boundary, never the node") — so it cannot single out
    // one property the way same-file bindParam does. This is the exact
    // shape real code uses (`getUserSelection({ userId: req.params.id })`),
    // and it is an inherited limitation, not something new here.
    const found = reachableSinkLabels(`
      import { queryUser } from './sinkHelperObjectParam'
      function handler(req) { queryUser({ id: req.params.id }) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('cross-file mutual recursion does not hang and resolves quietly', () => {
    const found = reachableSinkLabels(`
      import { helperA } from './cycleA'
      function handler(req) { helperA(req.params.id) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('an untainted argument through a cross-file helper stays quiet', () => {
    const found = reachableSinkLabels(`
      import { queryUser } from './sinkHelpers'
      function handler() { queryUser('literal') }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('calling the same helper twice with different taint resolves each independently', () => {
    const found = reachableSinkLabels(`
      function queryUser(id) { return db.query('SELECT * FROM users WHERE id = ' + id) }
      function handler(req) {
        queryUser(req.params.id)
        queryUser('literal')
      }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a call that is itself a sink is not double-reported as a reachable sink', () => {
    const found = reachableSinkLabels(`
      function handler(req) { db.query('SELECT * FROM users WHERE id = ' + req.params.id) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('a same-file callee whose sink closes over an outer variable is not reported again — direct traversal already finds it', () => {
    const found = reachableSinkLabels(`
      function handler(req) { function inner() { db.query('SELECT ' + req.query.id) } inner() }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('a same-file diamond (two callers sharing a helper that contains the sink) is reported exactly once', () => {
    const found = reachableSinkLabels(`
      function shared(x) { db.query('SELECT ' + x) }
      function helper1(x) { shared(x) }
      function helper2(x) { shared(x) }
      function handler(req) { function top(x) { helper1(x); helper2(x) } top(req.query.id) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a cross-file diamond (two same-file siblings sharing a helper, reached via a cross-file call) is reported exactly once', () => {
    const found = reachableSinkLabels(`
      import { createOrder } from './diamondService'
      function handler(req) { createOrder(req.body.note) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('an ordinary fan-out call graph with no sink resolves quickly, not exponentially', () => {
    // 20 functions, each calling the next two — no db/fs/exec/DOM anywhere.
    // Before memoizing per (function, binding signature), this walked the
    // shared tail once per path to it and took over 20 seconds at depth 26.
    const steps = Array.from({ length: 20 }, (_, i) =>
      i < 19
        ? `function step${i}(value) { return step${i + 1}(value) + step${Math.min(i + 2, 19)}(value) }`
        : `function step${i}(value) { return String(value).trim() }`
    ).join('\n')
    const start = Date.now()
    const found = reachableSinkLabels(`
      ${steps}
      function handler(req) { step0(req.query.q) }
    `)
    const elapsed = Date.now() - start
    assert.strictEqual(found.length, 0)
    assert.ok(elapsed < 2000, `expected under 2s, took ${elapsed}ms`)
  })
})
