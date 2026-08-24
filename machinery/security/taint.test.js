const test = require('node:test')
const assert = require('node:assert')
const { Linter } = require('eslint')
const globals = require('globals')
const { analyze } = require('./taint')
const { DEFAULTS, confidenceBucket } = require('./finding')
const registry = require('./registry')
const { describe } = require('node:test')

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

  assert.strictEqual(round(taint.confidence), 0.70)  // 0.75 - template
  assert.strictEqual(confidenceBucket(taint.confidence), 'medium')
  assert.deepStrictEqual(taint.path.map(hop => hop.kind), ['source', 'template'])
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
  assert.strictEqual(round(long.confidence), 0.70)
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

  assert.strictEqual(round(accumulated.confidence), 0.70)
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
  assert.strictEqual(round(contested.confidence), 0.62)  // 0.70 - multiWrite
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
    ['source:req.query', 'read:q', 'member:id', 'read:id', 'template:null']
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

test('the request source is path-qualified, so req.user and req.session are not input', () => {
  // Treating the whole `req` object as untrusted fired on every authenticated
  // Express app, many times per file. Untrusted input arrives through a known
  // set of properties and nowhere else.
  assert.deepStrictEqual(taintAtSinks(handler('db.query(`SELECT ${req.user.id}`)')), [])
  assert.deepStrictEqual(taintAtSinks(handler('db.query(`SELECT ${req.session.uid}`)')), [])
  assert.deepStrictEqual(taintAtSinks(handler('db.query(`SELECT ${req.app.locals.table}`)')), [])

  // ...but the qualifying properties still are, including deeper accesses.
  assert.strictEqual(taintAtSinks(handler('db.query(`SELECT ${req.query.id}`)')).length, 1)
  assert.strictEqual(taintAtSinks(handler('db.query(`SELECT ${req.query.filter.name}`)')).length, 1)
})

test('a non-request parameter named req is not a source unless it is accessed like one', () => {
  // `.map`, `.filter` and `.forEach` all hand you a two-argument callback, so
  // gating on arity matched unrelated callbacks while missing real handlers.
  assert.deepStrictEqual(
    taintAtSinks(`const pending = []; pending.map((request, index) => db.query('INSERT INTO audit VALUES (' + request.kind + ')'))`),
    []
  )
})

test('an Express error handler is a source, despite its four-argument signature', () => {
  // (err, req, res, next) puts req at index 1 with arity 4. Gating on the
  // handler signature made every error handler in every Express app invisible.
  const taint = onlyTaint('function onError(err, req, res, next) { db.query(`SELECT * FROM logs WHERE id = ${req.query.id}`) }')
  assert.strictEqual(confidenceBucket(taint.confidence), 'medium')
})

test('the dominant dynamic-query idiom stays above the reporting floor', () => {
  // `let x = default; if (input) x = input` is the most common way to build a
  // dynamic query in Node, and `?name=x' OR '1'='1` through it is a complete
  // auth bypass. The multi-write penalty used to stack on top of the ordinary
  // string-building hops and push these under minConfidence, so the analysis
  // found the flow, computed a confidence, and then discarded it with no output
  // at all — the worst failure mode available to a security tool.
  const guarded = onlyTaint(handler(`
    let where = '1=1'
    if (req.query.name) where = 'name = ' + req.query.name
    db.query('SELECT * FROM users WHERE ' + where)
  `))
  assert.strictEqual(round(guarded.confidence), 0.57)
  assert.ok(guarded.confidence >= DEFAULTS.minConfidence)

  const ternary = onlyTaint(handler(`
    let order = 'id'
    order = req.query.order ? req.query.order : 'id'
    db.query(\`SELECT * FROM users ORDER BY \${order}\`)
  `))
  assert.strictEqual(round(ternary.confidence), 0.54)
  assert.ok(ternary.confidence >= DEFAULTS.minConfidence)

  // Calling .trim() does nothing whatsoever for SQL, and used to be enough to
  // hide the finding.
  const trimmed = onlyTaint(handler(`
    let order = 'id'
    if (req.query.order) order = req.query.order.trim()
    db.query('SELECT * FROM users ORDER BY ' + order)
  `))
  assert.ok(trimmed.confidence >= DEFAULTS.minConfidence)
})

test('global functions propagate taint', () => {
  // The registry had no way to express a global-rooted propagator at all, so
  // String(x) and decodeURIComponent(x) broke every chain that used them.
  assert.strictEqual(taintAtSinks(handler("db.query('SELECT ' + String(req.query.id))")).length, 1)
  assert.strictEqual(taintAtSinks(handler("db.query('SELECT ' + decodeURIComponent(req.query.id))")).length, 1)
})

test('sanitized kinds are intersected, not chosen between', () => {
  // `{sql}` and `{url}` are both size one, so picking a single "worst" value
  // could select the branch already safe for the kind the sink cares about and
  // report nothing — making the result depend on operand order.
  const forward = onlyTaint(handler(`
    const a = mysql.escape(req.query.a)
    const b = encodeURIComponent(req.query.b)
    db.query(\`SELECT \${a} \${b}\`)
  `))
  const reversed = onlyTaint(handler(`
    const a = encodeURIComponent(req.query.a)
    const b = mysql.escape(req.query.b)
    db.query(\`SELECT \${a} \${b}\`)
  `))

  assert.deepStrictEqual([...forward.sanitizedFor], [])
  assert.deepStrictEqual([...reversed.sanitizedFor], [])
})

test('escape is only a SQL sanitizer on a database receiver', () => {
  // lodash, he and validator all export an *HTML* escaper called `escape`.
  // Matching the bare name meant one `_.escape()` anywhere in a file asserted
  // SQL safety it does not provide.
  const real = onlyTaint(handler("db.query('SELECT * FROM u WHERE n = ' + connection.escape(req.query.n))"))
  assert.deepStrictEqual([...real.sanitizedFor], ['sql'])

  // On a non-database receiver it is now an unknown call, which is a wall.
  // Note carefully what this does and does not achieve: both the old and the
  // new behaviour produce no report here, so the observable outcome for this
  // one expression is unchanged. What changed is the *reason* — the analysis no
  // longer claims a value is SQL-safe when it has no basis to. That matters
  // because sanitizedFor is intersected across a whole query, and because the
  // registry now structurally cannot express a bare-name sanitizer at all
  // (see registry.test.js).
  assert.deepStrictEqual(taintAtSinks(handler("db.query('SELECT * FROM u WHERE n = ' + _.escape(req.query.n))")), [])
})

test('a wrongly-trusted sanitizer cannot suppress the rest of a query', () => {
  // This is the case where the escape fix is observable: an unknown escaper on
  // one interpolation must not vouch for a different, raw interpolation.
  const taint = onlyTaint(handler(`
    const safe = connection.escape(req.query.a)
    const raw = req.query.b
    db.query(\`SELECT \${safe} \${raw}\`)
  `))

  assert.deepStrictEqual([...taint.sanitizedFor], [])
})

test('a source can be configured away', () => {
  const disabled = { ...DEFAULTS, registry: { ...DEFAULTS.registry, disable: ['express.request.query'] } }
  const found = []

  linter.verify(handler('db.query(`SELECT ${req.query.id}`)'), {
    plugins: { probe: { rules: { c: { create(context) {
      const analysis = analyze(context.sourceCode, disabled)
      return { CallExpression(node) {
        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'sql') return
        const taint = analysis.taintOf(node.arguments[sink.argument])
        if (taint) found.push(taint)
      } }
    } } } } },
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: { 'probe/c': 'error' },
  })

  assert.deepStrictEqual(found, [])
})

describe('consumer sanitizer registration', () => {
  const { rules } = require('../../index.js')

  function findings(code, sanitizers) {
    const found = []
    new Linter().verify(code, {
      plugins: { x: { rules } },
      rules: {
        'x/security-no-dangerously-set-inner-html': 'warn',
        'x/security-no-dom-xss-sink': 'warn',
      },
      settings: { '@kaliber/security': { registry: { sanitizers } } },
      languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    })
      .forEach(m => { if (!m.fatal) found.push(m.ruleId) })
    return found
  }

  test('helper root clears html for matcher rules without silencing others', () => {
    const i18n = [{ id: 'i18n', root: { helper: 'i18n' }, argument: 0, clears: ['html'], confidence: 0.9 }]
    const code = `<> <p dangerouslySetInnerHTML={{ __html: i18n('msg') }} /> <span dangerouslySetInnerHTML={{ __html: raw }} /> </>`

    assert.deepStrictEqual(findings(code, i18n), ['x/security-no-dangerously-set-inner-html'])
  })

  test('string method spellings work for consumer entries', () => {
    const dompurify = [{ id: 'dompurify', root: { method: 'sanitize', receiver: /^dompurify$/i }, argument: 0, clears: ['html'] }]
    assert.deepStrictEqual(
      findings('<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(x) }} />', dompurify),
      []
    )
  })

  test('bare method registration is still rejected at merge time', () => {
    assert.throws(() => registry.merge({ sanitizers: [{ id: 'trap', root: { method: 'escape' }, argument: 0, clears: ['sql'] }] }), /receiver.*constraint/)
  })
})

describe('allowlist guards — flow sensitivity', () => {
  const handler = body => `const TABLES = ['users', 'orders']\nfunction handler(req){ ${body} }`

  test('early-return negative guard clears later uses', () => {
    const found = taintAtSinks(handler(`
      const t = req.query.table
      if (!TABLES.includes(t)) return
      db.query(\`SELECT * FROM \${t}\`)
    `))
    assert.strictEqual(found.length, 0)
  })

  test('positive guard covers the consequent branch', () => {
    const found = taintAtSinks(handler(`
      const t = req.query.table
      if (TABLES.includes(t)) { db.query(\`SELECT * FROM \${t}\`) }
      db.query(\`SELECT * FROM \${t}\`)
    `))
    // The guarded use is proven; the unguarded one after the if still reports.
    assert.strictEqual(found.length, 1)
  })

  test('the else branch is not proven', () => {
    const found = taintAtSinks(handler(`
      const t = req.query.table
      if (TABLES.includes(t)) { log(t) } else { db.query(\`SELECT \${t}\`) }
    `))
    assert.strictEqual(found.length, 1)
  })

  test('a non-foldable collection proves nothing', () => {
    const t = onlyTaint(handler(`
      const t = req.query.table
      if (!TABLES_BY_USER.includes(t)) return
      db.query(\`SELECT * FROM \${t}\`)
    `))
    assert.ok(t.confidence > 0)
  })

  test('guards do not prove a different variable', () => {
    const found = taintAtSinks(handler(`
      const t = req.query.table
      const u = req.query.other
      if (!TABLES.includes(t)) return
      db.query(\`SELECT * FROM \${u}\`)
    `))
    assert.strictEqual(found.length, 1)
  })
})

describe('same-file helper summaries — interprocedural-lite', () => {
  test('an arrow helper wrapping a parameter propagates taint', () => {
    const found = taintAtSinks(`
      const pick = x => x.trim()
      function handler(req){ db.query(\`SELECT * FROM \${pick(req.query.table)}\`) }
    `)
    assert.strictEqual(found.length, 1)
    assert.ok(found[0].confidence > 0.5)
  })

  test('a helper pulling from its own closure source is tainted', () => {
    const found = taintAtSinks(`
      function handler(req){
        function getTable(){ return req.query.table }
        db.query(\`SELECT * FROM \${getTable()}\`)
      }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('nested helpers compose', () => {
    const found = taintAtSinks(`
      const inner = x => x.trim()
      function outer(x){ return inner(x) }
      function handler(req){ db.query(\`SELECT \${outer(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('untainted passthrough stays quiet', () => {
    const found = taintAtSinks(`
      const id = x => x
      function handler(){ db.query(\`SELECT \${id(config.table)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('cross-file helpers remain walls — the documented limitation', () => {
    const found = taintAtSinks(`
      const { getTable } = require('./tables')
      function handler(req){ db.query(\`SELECT \${getTable(req)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })
})
