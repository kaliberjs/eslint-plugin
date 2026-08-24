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

const sources = [
  // --- Node HTTP frameworks. Parameter-name heuristic: priced, never above 0.75.
  {
    id: 'express.request',
    root: { param: { name: /^(req|request)$/, index: 0, arity: [2, 3] } },
    path: [],
    confidence: 0.75,
    cwe: ['CWE-20'],
    note: 'Express/Connect/Koa-style handler request object, identified by parameter name and handler arity. Heuristic: a non-request parameter named `req` is a false positive, which is why this is capped below high confidence and is configurable away.',
  },

  // --- Browser globals. An unambiguous global: high confidence.
  { id: 'browser.location', root: { global: 'location' }, path: [], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.URL', root: { global: 'document' }, path: ['URL'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.referrer', root: { global: 'document' }, path: ['referrer'], confidence: 0.9, cwe: ['CWE-20'] },
  { id: 'browser.document.cookie', root: { global: 'document' }, path: ['cookie'], confidence: 0.85, cwe: ['CWE-20'] },
  { id: 'browser.window.name', root: { global: 'window' }, path: ['name'], confidence: 0.9, cwe: ['CWE-20'] },

  // --- Node process environment. Untrusted in the sense that matters for
  // injection: operator-controlled, not developer-controlled. Low confidence
  // because in practice env vars are trusted in most codebases.
  {
    id: 'node.process.argv',
    root: { global: 'process' },
    path: ['argv'],
    confidence: 0.6,
    cwe: ['CWE-20'],
    note: 'CLI arguments. Lower confidence: a CLI tool interpolating its own argv into a shell command is often an accepted risk rather than a vulnerability.',
  },
]

const sinks = [
  // --- SQL. Method-name rooted, because a database handle is a runtime value
  // (`new Pool()`, `knex(config)`, `new PrismaClient()`) and not an import we
  // can track. The name match alone would be noisy; it is only ever reported in
  // conjunction with a *tainted* argument, which is what makes it precise.
  {
    id: 'sql.query',
    root: { method: /^(query|execute)$/ },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'pg client.query(text, values), mysql2 connection.query/execute(sql, values), sequelize.query(sql, options), TypeORM manager.query(sql, parameters). In every one of these the parameter channel is a later argument, so a parameterized call leaves argument 0 untainted and reports nothing.\n\nNote for mysql2: `??` identifier placeholders are formatted client-side by query() and are NOT supported by execute(), which takes the prepared-statement path. The same SQL string is safe under one and silently wrong under the other.',
  },
  {
    id: 'sql.knex.raw',
    root: { method: /^(raw|whereRaw|joinRaw|havingRaw|orderByRaw|groupByRaw|andWhereRaw|orWhereRaw)$/ },
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
    root: { method: /^exec$/, receiver: /^(db|database|sqlite\d?|conn|connection|client|handle)$/i },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'better-sqlite3 / sqlite3 db.exec(sql) executes a statement batch and cannot be parameterized at all — the only remedy is not to build it from input. The receiver constraint is load-bearing: child_process.exec shares the name, and reporting "SQL injection" on a command injection is worse than missing it.',
  },
  {
    id: 'sql.prepare',
    root: { method: /^prepare$/ },
    argument: 0,
    requires: 'sql',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    note: 'db.prepare(sql). Preparing an interpolated string defeats the point of preparing it.',
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
    root: { method: /^escape$/ },
    argument: 0,
    clears: ['sql'],
    confidence: 0.9,
    note: 'mysql/mysql2 escape(). Clears sql only — this is emphatically not an HTML escaper. Confidence below 1 because the method name is matched without a resolved receiver.',
  },
  {
    id: 'mysql.escapeId',
    root: { method: /^escapeId$/ },
    argument: 0,
    clears: ['sql'],
    confidence: 0.9,
    note: 'Identifier quoting for table/column names — the one case parameter binding cannot cover.',
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
  { method: 'concat', receiver: true, args: 'all' },
  { method: 'join', receiver: true, args: 'none' },
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
  const merged = {
    sources: [...(extra.sources ?? []), ...sources],
    sinks: [...(extra.sinks ?? []), ...sinks],
    sanitizers: [...(extra.sanitizers ?? []), ...sanitizers],
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
  }

  for (const sanitizer of sanitizers) {
    if (!sanitizer.clears?.length) throw new Error(`security registry: sanitizer '${sanitizer.id}' clears nothing`)
    for (const kind of sanitizer.clears) {
      if (kind !== '*' && !(kind in KINDS)) throw new Error(`security registry: sanitizer '${sanitizer.id}' clears unknown kind '${kind}'. Known kinds: ${Object.keys(KINDS).join(', ')}, or '*'`)
    }
    if (sanitizer.clears.includes('*') && !sanitizer.note) throw new Error(`security registry: sanitizer '${sanitizer.id}' clears '*' without a note. A wildcard sanitizer silently disables detection for every sink, so it must say why that is sound.`)
  }
}

validate({ sinks, sanitizers })
