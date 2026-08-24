const test = require('node:test')
const assert = require('node:assert')
const { Linter } = require('eslint')
const globals = require('globals')
const { analyze } = require('./taint')
const { DEFAULTS, confidenceBucket } = require('./finding')

const linter = new Linter()

/**
 * Resolve the taint of every SQL sink argument in `code`.
 *
 * These tests assert **exact** confidence values, not just report/no-report.
 * The penalty table in taint.js is a set of magic numbers and will drift into
 * folklore unless changing one shows up as a diff across every case it affects,
 * forcing whoever changes it to look at each. That is the entire point of
 * pinning the numbers here rather than only asserting messageIds in the rule
 * test.
 */
function taintAtSinks(code, { browser = false } = {}) {
  const found = []

  linter.verify(code, {
    plugins: {
      probe: {
        rules: {
          collect: {
            create(context) {
              const analysis = analyze(context.sourceCode, DEFAULTS)
              return {
                CallExpression(node) {
                  const sink = analysis.sinkAt(node)
                  if (sink?.requires !== 'sql') return
                  const taint = analysis.taintOf(node.arguments[sink.argument])
                  if (taint) found.push(taint)
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
      globals: browser ? globals.browser : {},
    },
    rules: { 'probe/collect': 'error' },
  })

  return found
}

function onlyTaint(code, options) {
  const found = taintAtSinks(code, options)
  assert.strictEqual(found.length, 1, `expected exactly one tainted sink argument in:\n  ${code}`)
  return found[0]
}

const handler = code => `function handler(req, res) { ${code} }`

test('confidence: an Express request source starts at the heuristic ceiling', () => {
  // Parameter-name matching is a heuristic and is priced as one. 0.75 is the
  // ceiling for every finding rooted in it, which is why Express-sourced
  // findings are `medium` and browser-sourced ones are `high`.
  const taint = onlyTaint(handler('db.query(`SELECT ${req.query.id}`)'))

  assert.strictEqual(round(taint.confidence), 0.66)  // 0.75 - member - member - template
  assert.strictEqual(confidenceBucket(taint.confidence), 'medium')
  assert.deepStrictEqual(taint.path.map(hop => hop.kind), ['source', 'member', 'member', 'template'])
})

test('confidence: an unambiguous browser global is high', () => {
  const taint = onlyTaint('db.query(`SELECT ${document.referrer}`)', { browser: true })

  assert.strictEqual(round(taint.confidence), 0.85)  // 0.9 - template
  assert.strictEqual(confidenceBucket(taint.confidence), 'high')
})

test('confidence: exact hops cost nothing', () => {
  // Aliasing and destructuring are exact: the analysis knows precisely what
  // happened, so a long chain of them must not decay. This is why penalties are
  // additive rather than multiplicative.
  const short = onlyTaint(handler('const { id } = req.query; db.query(`SELECT ${id}`)'))
  const long = onlyTaint(handler(`
    const a = req.query
    const b = a
    const c = b
    const d = c
    const { id } = d
    db.query(\`SELECT \${id}\`)
  `))

  assert.strictEqual(round(short.confidence), round(long.confidence))
  assert.strictEqual(round(long.confidence), 0.68)
})

test('confidence: compound assignment is not charged as a competing write', () => {
  // `sql += ...` accumulates onto the previous value; it cannot kill the taint
  // of an earlier write, so the multi-write penalty must not apply. Charging it
  // put this textbook injection at 0.51 — one tweak from being dropped.
  const accumulated = onlyTaint(handler(`
    let sql = 'SELECT * FROM u WHERE id = ' + req.query.id
    sql += ' LIMIT 1'
    db.query(sql)
  `))

  assert.strictEqual(round(accumulated.confidence), 0.66)
  assert.ok(!accumulated.path.some(hop => hop.kind === 'multiWrite'))
})

test('confidence: a genuinely competing write is charged', () => {
  // Two plain assignments: we may be reading the one that was replaced. This is
  // real flow-insensitivity and it is priced.
  const contested = onlyTaint(handler(`
    let id = req.query.id
    id = 'safe'
    db.query(\`SELECT \${id}\`)
  `))

  assert.ok(contested.path.some(hop => hop.kind === 'multiWrite'))
  assert.strictEqual(round(contested.confidence), 0.51)  // 0.66 - multiWrite
})

test('a compound assignment does not hide the taint in its earlier write', () => {
  // Reference.writeExpr for `sql += rhs` is the RHS *only*. Reading "the last
  // write" of `sql` yields a bare string literal and misses the injection
  // entirely — the most likely silent false negative in the whole analysis.
  const found = taintAtSinks(handler(`
    let sql = 'SELECT * FROM u WHERE id = ' + req.query.id
    sql += ' LIMIT 1'
    db.query(sql)
  `))

  assert.strictEqual(found.length, 1)
})

test('sanitization is typed: a SQL escaper does not clear url, and vice versa', () => {
  const escaped = onlyTaint(handler("db.query('WHERE n = ' + mysql.escape(req.query.n))"))
  assert.deepStrictEqual([...escaped.sanitizedFor], ['sql'])

  // encodeURIComponent clears `url`. It reaches a SQL sink still SQL-tainted,
  // and no rule had to know that.
  const encoded = onlyTaint(handler("db.query('WHERE n = ' + encodeURIComponent(req.query.n))"))
  assert.deepStrictEqual([...encoded.sanitizedFor], ['url'])
})

test('coercion clears every kind, because the result cannot be an injectable string', () => {
  const coerced = onlyTaint(handler('db.query(`SELECT ${Number(req.query.id)}`)'))
  assert.ok(coerced.sanitizedFor.has('*'))
})

test('the least sanitised part decides a concatenated string', () => {
  // One unescaped interpolation ruins the query, even next to an escaped one.
  const mixed = onlyTaint(handler(`
    const a = mysql.escape(req.query.a)
    const b = req.query.b
    db.query(\`SELECT \${a} \${b}\`)
  `))

  assert.deepStrictEqual([...mixed.sanitizedFor], [])
})

test('an unknown call is a wall, not a low-confidence propagator', () => {
  // Propagating through arbitrary unknown functions is the single largest
  // source of false positives in tools that do it.
  assert.deepStrictEqual(taintAtSinks(handler('db.query(`SELECT ${transform(req.query.id)}`)')), [])
})

test('non-string operators do not propagate', () => {
  assert.deepStrictEqual(taintAtSinks(handler("db.query('LIMIT ' + (req.query.n - 0))")), [])
  assert.deepStrictEqual(taintAtSinks(handler("db.query('LIMIT ' + req.query.q.length)")), [])
})

test('the flow path records every hop, for the diagnostic and for auditing the number', () => {
  const taint = onlyTaint(handler(`
    const q = req.query
    const id = q.id
    db.query(\`SELECT * FROM u WHERE id = \${id}\`)
  `))

  assert.deepStrictEqual(
    taint.path.map(hop => `${hop.kind}:${hop.label}`),
    ['source:req', 'member:query', 'read:q', 'member:id', 'read:id', 'template:null']
  )

  // Every penalty is recorded on the hop that incurred it, so "why is this
  // 0.66" is answerable from the value alone.
  assert.strictEqual(
    round(taint.path.reduce((total, hop) => total - hop.penalty, taint.source.confidence)),
    round(taint.confidence)
  )
})

test('the analysis is cached per SourceCode, so fifty rules cost one construction', () => {
  let first = null
  let second = null

  linter.verify('db.query("SELECT 1")', {
    plugins: {
      probe: {
        rules: {
          a: { create(context) { first = analyze(context.sourceCode, DEFAULTS); return {} } },
          b: { create(context) { second = analyze(context.sourceCode, DEFAULTS); return {} } },
        },
      },
    },
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { 'probe/a': 'error', 'probe/b': 'error' },
  })

  assert.strictEqual(first, second)
  assert.ok(second.stats.cacheHits > 0)
})

function round(value) {
  return Math.round(value * 1000) / 1000
}
