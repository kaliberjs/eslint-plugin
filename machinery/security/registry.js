/**
 * Framework and library security knowledge, as data.
 *
 * If adding support for a framework means editing a `switch` somewhere, this
 * file has failed at its job.
 *
 * Three categories, and the distinction between them is the whole model:
 *
 *   source      untrusted input. Has no kind — `req.query.id` is just untrusted.
 *   sink        `requires: <kind>`. The *context* is what is typed, not the value.
 *   sanitizer   `clears: [<kind>]`. Provides sanitisation of specific kinds.
 *
 * That is what makes "a SQL escaper does not sanitize for HTML" fall out of set
 * membership rather than out of fifty rules each remembering it.
 */

const { SEVERITIES } = require('./finding')

/**
 * Closed vocabulary. A typo in a consumer's custom entry (`requires: 'sqli'`)
 * throws at load rather than silently never matching anything.
 */
const KINDS = {
  sql: 'CWE-89',
  html: 'CWE-79',
  shell: 'CWE-78',
  path: 'CWE-22',
  url: 'CWE-601',
  regex: 'CWE-1333',
  code: 'CWE-95',
  ldap: 'CWE-90',
  nosql: 'CWE-943',
  xpath: 'CWE-643',
  header: 'CWE-113',
  log: 'CWE-117',
  template: 'CWE-1336',
}

/**
 * The properties of an HTTP request object that actually carry untrusted input.
 *
 * Path-qualifying the source is what makes the parameter-name heuristic
 * tolerable. Treating the whole `req` object as untrusted fired on `req.user`,
 * `req.session` and `req.app.locals` — present in every authenticated Express
 * app, many times per file — and on any two-argument callback whose first
 * parameter happens to be called `request`, which `.map`/`.filter`/`.forEach`
 * hand you for free. Gating on the *shape of the access* instead is both
 * quieter and stricter: untrusted input arrives through these properties and
 * nowhere else.
 */
const REQUEST_PROPERTIES = [
  'query', 'body', 'params', 'headers', 'cookies', 'signedCookies',
  'url', 'originalUrl', 'path', 'hostname', 'host', 'ip',
  'rawBody', 'files', 'file',
]

const REQUEST_ROOT = { param: { name: /^(req|request)$/ } }

const sources = [
  // --- HTTP frameworks. Express, Connect, Fastify (`request`), Koa-ish, and
  // any handler following the same convention.
  //
  // Note there is deliberately no `index` or `arity` constraint. Gating on the
  // handler signature was both too strict and too loose: it missed every
  // Express error handler — `(err, req, res, next)`, arity 4 with `req` at
  // index 1, i.e. every error handler in every Express app — while still
  // matching unrelated two-argument callbacks. Path qualification does the
  // discriminating work now, so the signature gate earns nothing.
  ...REQUEST_PROPERTIES.map(property => ({
    id: `express.request.${property}`,
    root: REQUEST_ROOT,
    path: [property],
    confidence: 0.75,
    cwe: ['CWE-20'],
    note: `Untrusted HTTP request input via \`${property}\`. Matched by parameter name, so capped below high confidence. Disable with settings['@kaliber/security'].registry.disable = ['express.request.${property}'].`,
  })),

  // --- Browser globals. An unambiguous global, so high confidence.
  //
  // Both spellings of each are registered: `location.search` and
  // `window.location.search` are the same source, and only registering the
  // short form meant the *more common* spelling matched nothing.
  { id: 'browser.location', root: { global: 'location' }, path: [], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.window.location', root: { global: 'window' }, path: ['location'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.location', root: { global: 'document' }, path: ['location'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.self.location', root: { global: 'self' }, path: ['location'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.globalThis.location', root: { global: 'globalThis' }, path: ['location'], confidence: 0.9, cwe: ['CWE-20'] },

  { id: 'browser.document.URL', root: { global: 'document' }, path: ['URL'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.documentURI', root: { global: 'document' }, path: ['documentURI'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.referrer', root: { global: 'document' }, path: ['referrer'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.cookie', root: { global: 'document' }, path: ['cookie'], confidence: 0.85, cwe: ['CWE-20'] },
  { id: 'browser.window.name', root: { global: 'window' }, path: ['name'], confidence: 0.9, cwe: ['CWE-20'] },

  // --- Node process environment. Operator-controlled rather than
  // developer-controlled, which is a real but much weaker claim.
  {
    id: 'node.process.argv',
    root: { global: 'process' },
    path: ['argv'],
    confidence: 0.45,
    cwe: ['CWE-20'],
    note: 'CLI arguments. Below the default reporting floor deliberately, so it is computed but not reported: whoever runs a CLI tool already controls its database connection, so argv reaching a query is normally an accepted risk rather than a vulnerability. Lower minConfidence to 0.3 for an audit pass and these appear.',
  },
]

const sinks = [
  // --- SQL. Method-name rooted, because a database handle is a runtime value
  // (`new Pool()`, `knex(config)`, `new PrismaClient()`) and not an import we
  // can track. The name match alone would be noisy; it is only ever reported in
  // conjunction with a *tainted* argument, which is what makes it precise.
  {
    id: 'sql.query',
    root: { method: /^(query|execute)$/, receiver: /^(db|dbc|database|conn|connection|pool|client|knex|sequelize|prisma|sqlite\d?|sql|trx|transaction|manager|repository|dataSource|ds|orm|store|handle)$/i },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'pg client.query(text, values), mysql2 connection.query/execute(sql, values), sequelize.query(sql, options), TypeORM manager.query(sql, parameters). In every one of these the parameter channel is a later argument, so a parameterized call leaves argument 0 untainted and reports nothing.\n\nNote for mysql2: `??` identifier placeholders are formatted client-side by query() and are NOT supported by execute(), which takes the prepared-statement path. The same SQL string is safe under one and silently wrong under the other.',
  },
  {
    id: 'sql.knex.raw',
    root: { method: /^(raw|whereRaw|joinRaw|havingRaw|orderByRaw|groupByRaw|andWhereRaw|orWhereRaw)$/, receiver: /^(db|dbc|database|conn|connection|pool|client|knex|sequelize|prisma|sqlite\d?|sql|trx|transaction|manager|repository|dataSource|ds|orm|store|handle)$/i },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'Knex raw-SQL escape hatches. knex.raw(sql, bindings) — bindings are argument 1.',
  },
  {
    id: 'sql.prisma.unsafe',
    root: { method: /^\$(queryRawUnsafe|executeRawUnsafe)$/ },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'Prisma\'s explicitly-unsafe raw APIs. Deliberately NOT matching $queryRaw/$executeRaw: those are tagged templates that parameterize their interpolations, so flagging them is a false positive. Note these DO accept parameters — $queryRawUnsafe(sql, ...values) with a static sql is safe, which falls out of only checking argument 0. See registry.test.js.',
  },
  {
    id: 'sql.sqlite.exec',
    root: { method: /^exec$/, receiver: /^(db|dbc|database|sqlite\d?|pool|sql|trx|transaction)$/i },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'better-sqlite3 / sqlite3 db.exec(sql) executes a statement batch and cannot be parameterized at all — the only remedy is not to build it from input. The receiver constraint is load-bearing and deliberately narrow: child_process.exec shares the name (reporting "SQL injection" on a command injection is worse than missing it), and `conn`/`connection` are excluded because a network socket or pub/sub connection is commonly named that and commonly has an unrelated exec(). sqlite handles are named db/database/sqlite in practice.',
  },
  {
    id: 'sql.prepare',
    root: { method: /^prepare$/, receiver: /^(db|dbc|database|conn|connection|pool|client|knex|sequelize|prisma|sqlite\d?|sql|trx|transaction|manager|repository|dataSource|ds|orm|store|handle)$/i },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'db.prepare(sql). Preparing an interpolated string defeats the point of preparing it.',
  },
  {
    id: 'sql.statement.run',
    root: { method: /^(all|get|run|each)$/, receiver: /^(db|dbc|database|sqlite\d?|conn|connection|pool)$/i },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'node-sqlite3 db.all/get/run/each(sql, params, cb) — the primary API of that driver and far more used than exec().\n\nThe receiver list deliberately excludes `stmt` and `statement`, and this is the opposite of an oversight. On a *database handle* argument 0 is SQL; on a *prepared statement* it is a bind parameter, so `stmt.get(req.params.id)` is the correct, safe better-sqlite3 usage. Including statement receivers made the safe API a sink and reported the recommended pattern. `db.prepare(sql).get(x)` is unaffected either way, because its receiver is a call expression rather than a name.',
  },
]

const sanitizers = [
  // --- Type-changing operations. The only legitimate `'*'`: the result
  // provably cannot be an injectable string any more. Every entry here needs a
  // note saying why, and registry.test.js asserts this list stays short.
  {
    id: 'global.Number',
    root: { global: 'Number' },
    argument: 0,
    clears: ['*'],
    note: 'Returns a number or NaN. Cannot carry an injectable payload in any sink language.',
  },
  {
    id: 'global.parseInt',
    root: { global: 'parseInt' },
    argument: 0,
    clears: ['*'],
    note: 'Returns a number or NaN.',
  },
  {
    id: 'global.parseFloat',
    root: { global: 'parseFloat' },
    argument: 0,
    clears: ['*'],
    note: 'Returns a number or NaN.',
  },
  {
    id: 'global.BigInt',
    root: { global: 'BigInt' },
    argument: 0,
    clears: ['*'],
    note: 'Returns a BigInt or throws.',
  },

  // --- Kind-specific escapers. Note what each does NOT clear.
  {
    id: 'mysql.escape',
    root: { method: /^escape$/, receiver: /^(mysql2?|sql|conn|connection|db|database|pool|client|knex)$/i },
    argument: 0,
    clears: ['sql'],
    confidence: 0.9,
    note: 'mysql/mysql2 escape(). Clears sql only — emphatically not an HTML escaper.\n\nThe receiver constraint is the load-bearing part and is not optional. `escape` is one of the most overloaded names in the ecosystem: lodash, he and validator all export an *HTML* escaper by that name. Matching the bare name meant a single `_.escape(req.query.n)` reaching a query silently turned SQL detection off, with no diagnostic, while the documentation told the developer they were covered. A wrongly-recognised sanitizer is strictly worse than an unrecognised one — an unrecognised escaper costs a false positive, a wrongly-recognised one converts an honest wall into an assertion of safety.',
  },
  {
    id: 'mysql.escapeId',
    root: { method: /^escapeId$/, receiver: /^(mysql2?|sql|conn|connection|db|database|pool|client|knex)$/i },
    argument: 0,
    clears: ['sql'],
    confidence: 0.9,
    note: 'Identifier quoting for table/column names — the one case parameter binding cannot cover. Doubles backticks, so the output cannot break out of a quoted identifier and it does prevent injection, which is why it clears `sql`.\n\nKnown imprecision, recorded rather than modelled: escapeId makes an *identifier* position safe, not a *value* position. `WHERE name = ${escapeId(v)}` renders a column reference instead of a literal — a semantically wrong query, not an injection. Distinguishing the two positions needs a SQL parser, so this is deliberately out of scope; see docs/research/security-review-no-sql-injection.md.',
  },
  {
    id: 'global.encodeURIComponent',
    root: { global: 'encodeURIComponent' },
    argument: 0,
    clears: ['url'],
    note: 'Percent-encoding. Clears url only. It does NOT make a value safe for SQL, shell, or HTML — a fact this project has seen asserted incorrectly often enough to warrant the note.',
  },
]

/**
 * Methods assumed to propagate taint from receiver and/or arguments, matched by
 * name because phase 1 has no type information. A table, so adding `normalize`
 * is a one-line data change.
 *
 * `args: 'all' | 'none' | number[]`
 */
const propagators = [
  // Global functions. A tainted value survives every one of these.
  { global: 'String', args: 'all' },
  { global: 'decodeURIComponent', args: 'all' },
  { global: 'decodeURI', args: 'all' },
  { global: 'encodeURI', args: 'all' },
  { global: 'unescape', args: 'all' },

  // Methods.
  { method: 'concat', receiver: true, args: 'all' },
  { method: 'split', receiver: true, args: 'none' },
  { method: 'toLocaleLowerCase', receiver: true, args: 'none' },
  { method: 'toLocaleUpperCase', receiver: true, args: 'none' },
  { method: 'flat', receiver: true, args: 'none' },
  { method: 'join', receiver: true, args: 'all' },
  { method: 'toString', receiver: true, args: 'none' },
  { method: 'trim', receiver: true, args: 'none' },
  { method: 'trimStart', receiver: true, args: 'none' },
  { method: 'trimEnd', receiver: true, args: 'none' },
  { method: 'slice', receiver: true, args: 'none' },
  { method: 'substring', receiver: true, args: 'none' },
  { method: 'substr', receiver: true, args: 'none' },
  { method: 'toLowerCase', receiver: true, args: 'none' },
  { method: 'toUpperCase', receiver: true, args: 'none' },
  { method: 'normalize', receiver: true, args: 'none' },
  { method: 'padStart', receiver: true, args: 'all' },
  { method: 'padEnd', receiver: true, args: 'all' },
  { method: 'repeat', receiver: true, args: 'none' },
  { method: 'replace', receiver: true, args: [1] },
  { method: 'replaceAll', receiver: true, args: [1] },
  { method: 'at', receiver: true, args: 'none' },
]

/**
 * Reading these off a tainted value yields something that is not an injectable
 * string, so taint stops here.
 */
const nonPropagatingProperties = ['length', 'size', 'byteLength', 'constructor', '__proto__']

module.exports = {
  KINDS,
  sources,
  sinks,
  sanitizers,
  propagators,
  nonPropagatingProperties,
  merge,
  validate,
}

/**
 * Consumer extension: `settings['@kaliber/security'].registry`. A list users
 * append to, not a registration API.
 */
function merge(extra = {}) {
  // `disable` is what makes "configurable away" a true statement rather than an
  // aspiration. Prepending a replacement entry shadows a built-in for lookups,
  // but there was previously no way to *remove* one, so a consumer whose
  // parameter happens to be named `req` had no lever short of raising
  // minConfidence globally — which would silence every other rule too.
  const disabled = new Set(extra.disable ?? [])
  const keep = entry => !disabled.has(entry.id)

  const merged = {
    sources: [...(extra.sources ?? []), ...sources.filter(keep)],
    sinks: [...(extra.sinks ?? []), ...sinks.filter(keep)],
    sanitizers: [...(extra.sanitizers ?? []), ...sanitizers.filter(keep)],
    propagators: [...(extra.propagators ?? []), ...propagators],
    nonPropagatingProperties: [...(extra.nonPropagatingProperties ?? []), ...nonPropagatingProperties],
  }

  validate(merged)
  return merged
}

/**
 * Fail loudly at load. A custom sink whose `requires` is misspelled would
 * otherwise never match, and never matching looks exactly like being secure.
 */
function validate({ sinks, sanitizers }) {
  for (const sink of sinks) {
    if (!sink.requires) throw new Error(`security registry: sink '${sink.id}' has no \`requires\` kind. A sink that requires general safety is a sink whose author has not decided what it is vulnerable to.`)
    if (!(sink.requires in KINDS)) throw new Error(`security registry: sink '${sink.id}' requires unknown kind '${sink.requires}'. Known kinds: ${Object.keys(KINDS).join(', ')}`)
    if (!SEVERITIES.includes(sink.severity)) throw new Error(`security registry: sink '${sink.id}' has severity '${sink.severity}', which no report decision recognises. Known severities: ${SEVERITIES.join(', ')}`)
  }

  for (const sanitizer of sanitizers) {
    if (!sanitizer.clears?.length) throw new Error(`security registry: sanitizer '${sanitizer.id}' clears nothing`)
    for (const kind of sanitizer.clears) {
      if (kind !== '*' && !(kind in KINDS)) throw new Error(`security registry: sanitizer '${sanitizer.id}' clears unknown kind '${kind}'. Known kinds: ${Object.keys(KINDS).join(', ')}, or '*'`)
    }
    if (sanitizer.clears.includes('*') && !sanitizer.note) throw new Error(`security registry: sanitizer '${sanitizer.id}' clears '*' without a note. A wildcard sanitizer silently disables detection for every sink, so it must say why that is sound.`)

    // A sanitizer matched by bare method name trusts a function because of what
    // it is called, which AGENTS.md forbids outright. `escape` is the canonical
    // trap: lodash, he and validator all export an HTML escaper by that name.
    if (sanitizer.root.method && !sanitizer.root.receiver) throw new Error(`security registry: sanitizer '${sanitizer.id}' is matched by method name with no \`receiver\` constraint, which trusts a function because of what it is called. Add a receiver pattern, or root the entry in a module or global.`)
  }
}

validate({ sinks, sanitizers })
