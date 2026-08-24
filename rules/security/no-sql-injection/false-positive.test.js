const { describe, it } = require('node:test')
const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for `no-sql-injection`.
 *
 * Every case in this file is *safe, ordinary, idiomatic* code. None of it is a
 * vulnerability. The rule must stay silent on all of it, because a security
 * rule that fires on normal application code gets switched off, and then every
 * other rule in the plugin goes with it.
 *
 * Two parts:
 *
 *   1. CLEAN — the rule is quiet. These are regression tests: they pin the
 *      quiet down so a later widening of the registry has to break a test to
 *      make the plugin noisier.
 *   2. WAS FAILING — at the bottom. These 33 cases were confirmed false
 *      positives when this corpus was written, and 32 of them are now fixed.
 *      They are kept as individually-named cases rather than folded into the
 *      CLEAN suite, because knowing *which* safe patterns the rule once fired
 *      on is what stops them coming back.
 *
 * The one still failing is the early-return allowlist guard, which needs flow
 * sensitivity. It is left failing on purpose: deleting it would delete the
 * finding, and "documented" is not the same as "quiet" to someone reading CI
 * output.
 *
 * What the 32 fixes were, in order of how much they mattered:
 *
 *   - The request source is path-qualified — one entry per untrusted property
 *     instead of tainting the whole `req` object. This alone accounted for 18
 *     of the 33, because `req.user` and `req.session` appear in every
 *     authenticated Express app.
 *   - Sink receivers are allowlisted, so `.query()`/`.execute()`/`.raw()` on a
 *     command bus, job runner or analytics client is not a SQL sink.
 *   - `conn`/`connection` were removed from the `exec` receiver list: a pub/sub
 *     connection commonly has an unrelated `exec()`.
 *   - Allowlist membership in a ternary is recognised as a proof.
 *   - `process.argv` sits below the default reporting floor.
 *
 * Companion to test.js, which pins the true positives. Anything proposed here
 * has to keep every `invalid` case in that file invalid — verified.
 */

const handler = code => `function handler(req, res) { ${code} }`

describe('CLEAN — safe code the rule correctly ignores (regression tests)', () => test('security-no-sql-injection', merge(

  {
    // --- validation libraries ---------------------------------------------
    // An unknown call is a wall, so a parsed/validated value arrives untainted.
    // This is the correct answer for the right reason: nobody registered zod as
    // a sanitizer, the analysis simply refuses to reason through a call it does
    // not know.
    valid: [
      handler(`const { id } = schema.parse(req.query); db.query(\`SELECT * FROM u WHERE id = \${id}\`)`),
      handler(`const parsed = schema.safeParse(req.query); db.query(\`SELECT * FROM u WHERE id = \${parsed.data.id}\`)`),
      handler(`const { value } = schema.validate(req.query); db.query(\`SELECT * FROM u WHERE id = \${value.id}\`)`),
      `async function handler(req, res) {
         const input = await schema.validateAsync(req.body)
         db.query(\`SELECT * FROM u WHERE n = '\${input.name}'\`)
       }`,
    ],
    invalid: [],
  },

  {
    // --- allowlists that resolve to a developer-controlled value ----------
    // The value that reaches the query is read off a constant map, so the
    // request only ever picked *which* constant. The most common safe way to
    // build a dynamic ORDER BY.
    valid: [
      `const COLUMN = { id: 'id', name: 'name' }
       function handler(req, res) { db.query(\`SELECT * FROM u ORDER BY \${COLUMN[req.query.sort] || 'id'}\`) }`,

      `const ORDER = { newest: 'created_at DESC', name: 'name ASC' }
       function handler(req, res) { db.query(\`SELECT * FROM u ORDER BY \${ORDER[req.query.sort] ?? ORDER.newest}\`) }`,

      `const ORDER = { newest: 'created_at DESC' }
       function handler(req, res) {
         const key = Object.keys(ORDER).includes(req.query.sort) ? req.query.sort : 'newest'
         db.query(\`SELECT * FROM u ORDER BY \${ORDER[key]}\`)
       }`,

      // switch/case: every branch assigns a literal.
      handler(`let order = 'id'
               switch (req.query.sort) { case 'name': order = 'name'; break; case 'date': order = 'created_at'; break }
               db.query(\`SELECT * FROM u ORDER BY \${order}\`)`),

      // The request only chooses between two literals.
      handler(`const direction = req.query.dir === 'asc' ? 'ASC' : 'DESC'
               db.query(\`SELECT * FROM u ORDER BY id \${direction}\`)`),

      // find() returns an element of the allowlist, not the request value.
      `const SORTABLE = ['id', 'name']
       function handler(req, res) {
         const sort = SORTABLE.find(c => c === req.query.sort) || 'id'
         db.query(\`SELECT * FROM u ORDER BY \${sort}\`)
       }`,
    ],
    invalid: [],
  },

  {
    // --- values that are developer- or operator-controlled ----------------
    valid: [
      `const config = require('./config'); db.query(\`SET statement_timeout = \${config.timeoutMs}\`)`,
      `const Status = { active: 'active' }; db.query(\`SELECT * FROM u WHERE status = '\${Status.active}'\`)`,
      `db.query(\`SET search_path = \${process.env.PG_SCHEMA}\`)`,
      `const TABLE = 'users'; db.query(\`SELECT count(*) FROM \${TABLE}\`)`,

      // A value that came back out of the database is not request input.
      `async function backfill() {
         const { rows } = await db.query('SELECT id FROM users')
         await db.query(\`UPDATE stats SET n = \${rows.length}\`)
       }`,

      // Migration and seed scripts: literal SQL, literal identifiers.
      `exports.up = function (knex) {
         const table = 'users'
         return knex.raw(\`ALTER TABLE \${table} ADD COLUMN nickname text\`)
       }`,
      `const seeds = ['alice', 'bob']
       for (const name of seeds) db.query(\`INSERT INTO users (name) VALUES ('\${name}')\`)`,

      // A CLI tool that coerces its own argument.
      `const limit = Number(process.argv[2]); db.query(\`SELECT * FROM users LIMIT \${limit}\`)`,
    ],
    invalid: [],
  },

  {
    // --- idiomatic safe query building ------------------------------------
    valid: [
      // Dynamic `IN (...)`: the placeholders are generated, the values go
      // through the parameter channel.
      handler(`const ids = req.body.ids
               const placeholders = ids.map((_, i) => '$' + (i + 1)).join(', ')
               db.query(\`SELECT * FROM users WHERE id IN (\${placeholders})\`, ids)`),
      handler(`const ids = req.body.ids
               const placeholders = new Array(ids.length).fill('?').join(', ')
               db.query(\`SELECT * FROM users WHERE id IN (\${placeholders})\`, ids)`),

      // Identifier quoting — the one thing bind parameters cannot cover.
      handler(`const column = mysql.escapeId(req.query.sort); db.query(\`SELECT * FROM u ORDER BY \${column}\`)`),

      // Query builder, no raw escape hatch.
      handler(`return knex('users').where({ id: req.query.id }).orderBy('id')`),

      // Pagination, coerced.
      handler(`const limit = Number(req.query.limit) || 20
               const offset = Number(req.query.offset) || 0
               db.query(\`SELECT * FROM u LIMIT \${limit} OFFSET \${offset}\`)`),
      handler(`const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
               db.query(\`SELECT * FROM u LIMIT \${limit}\`)`),

      // The `WHERE 1=1` accumulator. Every fragment appended is a constant;
      // the request values only ever land in `values`.
      handler(`const values = []
               let sql = 'SELECT * FROM users WHERE 1=1'
               if (req.query.name) { values.push(req.query.name); sql += \` AND name = $\${values.length}\` }
               if (req.query.city) { values.push(req.query.city); sql += \` AND city = $\${values.length}\` }
               return db.query(sql, values)`),

      // The same idea with an array of constant fragments.
      handler(`const where = []
               if (req.query.name) where.push('name = ?')
               if (req.query.city) where.push('city = ?')
               const sql = 'SELECT * FROM users' + (where.length ? ' WHERE ' + where.join(' AND ') : '')
               return db.query(sql, [req.query.name, req.query.city].filter(Boolean))`),

      // Prepared statement with the values on run/get.
      handler(`const stmt = db.prepare('SELECT * FROM users WHERE id = ?'); return stmt.get(req.params.id)`),

      // Sequelize server-side bind.
      handler(`return sequelize.query('SELECT * FROM u WHERE id = $1', { bind: [req.query.id] })`),

      // A projection list built from a constant array.
      `const COLUMNS = ['id', 'name', 'email']
       function handler(req, res) { return db.query(\`SELECT \${COLUMNS.join(', ')} FROM users\`) }`,

      // Coercion that is not a registered sanitizer still stops the flow,
      // because the call itself is a wall.
      handler(`db.query(\`SELECT * FROM u WHERE id = \${String(Number(req.params.id))}\`)`),
      handler(`db.query(\`SELECT * FROM u WHERE active = \${Boolean(req.query.active)}\`)`),

      // Tainted input in a log line beside a parameterized query.
      handler(`logger.info(\`fetching \${req.query.id}\`); return db.query('SELECT * FROM u WHERE id = $1', [req.query.id])`),
    ],
    invalid: [],
  },

  {
    // --- sink-shaped method names on things that are not databases ---------
    valid: [
      // RegExp.prototype.exec. Extremely common, and the receiver constraint on
      // the exec sink is what keeps it quiet.
      `const re = /^[a-z]+$/; function check(value) { return re.exec(value) }`,
      handler(`const re = /(\\d+)/; return re.exec(req.query.id)`),
      handler(`return pattern.exec(req.body.text)`),

      // DOM neighbours of the query sink.
      handler(`return document.querySelector(\`[data-id="\${req.query.id}"]\`)`),
      handler(`return document.querySelectorAll(\`[data-id="\${req.query.id}"]\`)`),

      // Apollo: the query text is a constant, the variables are an object.
      handler(`return client.query({ query: USER_QUERY, variables: { id: req.query.id } })`),

      // Mongoose: `.exec()` on a chain has no identifier receiver.
      handler(`return Model.find({ name: req.query.name }).exec()`),

      // String.raw, and a `.raw` that is a stream rather than knex.
      handler(`return String.raw\`SELECT \${req.query.a}\``),
      handler(`res.raw.write(\`hello \${req.query.name}\`)`),

      // A `.prepare()` that takes no argument.
      handler(`return app.prepare()`),

      // child_process.exec, under its usual names. Reporting "SQL injection"
      // on a command injection is worse than reporting nothing.
      `const { exec } = require('child_process'); function handler(req, res) { exec(\`ls \${req.query.dir}\`) }`,
      `const cp = require('child_process'); function handler(req, res) { cp.exec(\`ls \${req.query.d}\`) }`,
    ],
    invalid: [],
  },

  {
    // --- fixtures, mocks and test helpers ---------------------------------
    valid: [
      // A fake request is a variable, not a parameter, so the heuristic does
      // not see it.
      `const req = { query: { id: '1' }, params: {} }
       db.query(\`SELECT * FROM users WHERE id = \${req.query.id}\`)`,

      `const fixtures = { req: { query: { id: '1' } }, sql: 'SELECT * FROM users WHERE id = 1' }
       function setup(req, res) { return db.query(fixtures.sql) }`,

      `async function withUser(req, res) { await db.query("INSERT INTO users (name) VALUES ('test')") }`,

      `const db = { query: jest.fn() }; function handler(req, res) { db.query('SELECT 1') }`,

      // msw request handler: a mock server, and nothing reaches a SQL sink.
      `const handlers = [rest.get('/api/users', (req, res, ctx) => res(ctx.json({ id: req.params.id })))]`,
    ],
    invalid: [],
  },

  {
    // --- shadowing and scope ----------------------------------------------
    valid: [
      // Module-scope `req` that is a client, not a request.
      `const req = createClient(); db.query(\`SELECT * FROM cache WHERE host = '\${req.host}'\`)`,

      // Arity 1 is outside the handler shape.
      handler(`ids.forEach(req => db.query(\`SELECT * FROM u WHERE id = \${req}\`))`),
      `function outer(a, b) {
         function inner(req) { return db.query(\`SELECT * FROM u WHERE id = \${req.id}\`) }
         return inner(a)
       }`,

      // A repository method that happens to be named `query` and parameterizes.
      `class UserRepo {
         query(name, options) { return this.db.query('SELECT * FROM users WHERE name = $1', [name]) }
       }`,

      // A parameter named `userId` looks tainted and is not a source.
      `function build(userId) { return db.query(\`SELECT * FROM u WHERE id = \${userId}\`) }`,
      `const query = 'SELECT 1'; db.query(query)`,
    ],
    invalid: [],
  },

  {
    // --- shapes near the parameter heuristic that stay quiet ---------------
    valid: [
      // Destructured in a for-of: not a parameter definition.
      `function logPending(requests) {
         for (const [request, index] of requests.entries())
           db.query(\`INSERT INTO audit (kind, position) VALUES ('\${request.kind}', \${index})\`)
       }`,

      // Arity 1 handler: the App Router shape. Quiet, but see the note in the
      // FAILING block — this is a false *negative*, not a win.
      `export async function GET(request) {
         const id = new URL(request.url).searchParams.get('id')
         return db.query('SELECT * FROM u WHERE id = $1', [id])
       }`,

      // GraphQL resolver: `request`-ish data is at index 2, not 0.
      `const resolvers = { Query: { me(parent, args, context) { return db.query(\`SELECT * FROM u WHERE id = \${context.userId}\`) } } }`,
    ],
    invalid: [],
  },

)))

/**
 * ============================================================================
 * WAS FAILING — confirmed false positives, 32 of 33 now fixed
 * ============================================================================
 *
 * Every case below is safe code that the rule reported when this corpus was
 * written. All but the early-return allowlist guard are fixed. The narrowings
 * proposed per-case are recorded as written, including where the eventual fix
 * differed — the reasoning is the useful part, not the prediction.
 *
 * Each case carries the safe pattern it represents and a narrowing that fixes
 * it without turning any `invalid` case in test.js valid.
 *
 * Two narrowings account for almost all of it.
 *
 * N1 — PATH-QUALIFY THE EXPRESS SOURCE.
 *   Today `express.request` has `path: []`, so the *whole object* named `req`
 *   or `request` is untrusted, and every property read off it is tainted.
 *   Replace it with one entry per genuinely untrusted property:
 *
 *     path: ['query'] | ['body'] | ['params'] | ['headers'] | ['cookies'] |
 *     ['url'] | ['originalUrl'] | ['path'] | ['hostname'] | ['ip'] | ['rawBody']
 *
 *   Untrusted input in Express, Fastify, Next and Workers arrives through
 *   exactly those. Nothing in test.js reaches a sink by any other property, so
 *   there is no new false negative among the true positives — verified by
 *   simulating the narrowing through `settings['@kaliber/security'].registry`.
 *
 *   One supporting change in taint.js is required: `matchSourcePath` compares
 *   `source.path.length === path.length`, so `const { query: { id } } = req`
 *   (path `['query','id']`) would stop matching `path: ['query']`. It must
 *   match a *prefix* — `source.path.every((s, i) => s === path[i])` with
 *   `path.length >= source.path.length`. Without that one line N1 introduces a
 *   real false negative and must not be applied.
 *
 *   Residual, accepted: `request.url` stays a source, so a fetch/axios wrapper
 *   whose parameter is named `request` still reports. Keeping it is right —
 *   `request.url` in a Worker or a Next route handler is the real thing.
 *
 * N2 — CONSTRAIN THE SQL SINK RECEIVERS.
 *   `sql.query` (`/^(query|execute)$/`), `sql.prepare` and `sql.knex.raw` have
 *   no `root.receiver`, so any `.query()`, `.execute()`, `.prepare()` or
 *   `.raw()` in the file is a SQL sink. `sql.sqlite.exec` already carries the
 *   fix and the note explaining why it is load-bearing; the same pattern
 *   applies:
 *
 *     receiver: /^(db|database|conn|connection|pool|client|knex|sequelize|
 *                 prisma|sql|trx|transaction|tx|pg|mysql\d?|sqlite\d?|
 *                 datasource|manager|repo|repository|em|store|handle)$/i
 *
 *   `matchesReceiver` already reads the last property of a member chain, so
 *   `env.DB.prepare(...)` and `this.db.query(...)` keep working. Every sink
 *   receiver in test.js (`db`, `conn`, `knex`, `sequelize`, `prisma`,
 *   `sqlite`) is in the list.
 *
 *   Note this cannot be done from consumer settings: `merge` puts consumer
 *   entries first and `sinkAt` uses `find`, so a narrower consumer entry that
 *   fails to match simply falls through to the permissive built-in. Narrowing
 *   is only possible in registry.js.
 *
 * N3 — ALLOWLIST-GUARDED TERNARY (smaller, still worth it).
 *   `LIST.includes(v) ? v : 'default'` provably evaluates to a member of
 *   `LIST` or to the default. When the ternary test is `<static array or Set
 *   of literals>.includes(v)` / `.has(v)` and the consequent is that same `v`,
 *   the result cannot carry a payload, so it clears `'*'`. This is a proof,
 *   not a heuristic, which is the bar registry.js sets for a wildcard.
 *
 * Not fixable without flow sensitivity, and honest as documentation only:
 * the early-return allowlist guard (`if (!TABLES.includes(t)) return`) — this
 * is limitation 8 in the readme, and it deserves a named example there
 * because it is how most people write the check.
 */
const falsePositives = [

  // Array callback whose first parameter is named `request`/`req`.
  // `.map((request, index) => …)`, `.forEach`, `.filter` and `.sort` all
  // produce a two-parameter function whose parameter 0 is the element. The most
  // common shape in this file: any codebase with a `requests` collection hits
  // it. Narrowing: N1 — `request.kind` is not a request property.
  ['map((request, index) => …)', `
    function insertAll(pendingRequests) {
      return Promise.all(pendingRequests.map((request, index) =>
        db.query(\`INSERT INTO audit (kind, position) VALUES ('\${request.kind}', \${index})\`)
      ))
    }`],
  ['forEach((req, i) => …)', `
    function report(rows) {
      rows.forEach((req, i) => db.query(\`UPDATE audit SET position = \${i} WHERE kind = '\${req.kind}'\`))
    }`],
  ['filter((request, index) => …)', `
    function pick(requests) {
      return requests.filter((request, index) => db.query(\`SELECT 1 FROM r WHERE k = '\${request.kind}'\`))
    }`],

  // `req.user`, `req.session`, `req.locals`, `req.app.locals`. Set by auth or
  // by middleware from a verified JWT or a server-side session store, and read
  // constantly. The shape that makes the rule feel wrong to an Express
  // developer. Narrowing: N1.
  ['req.user.id from passport / a verified JWT',
    `function handler(req, res) { db.query(\`SELECT * FROM orders WHERE user_id = \${req.user.id}\`) }`],
  ['req.user destructured',
    `function handler(req, res) { const { id } = req.user; db.query(\`SELECT * FROM orders WHERE user_id = \${id}\`) }`],
  ['req.session server-side state',
    `function handler(req, res) { db.query(\`SELECT * FROM carts WHERE session = '\${req.session.id}'\`) }`],
  ['req.locals set by earlier middleware',
    `function handler(req, res, next) { db.query(\`SELECT * FROM tenants WHERE id = \${req.locals.tenantId}\`) }`],
  ['req.app.locals config',
    `function handler(req, res) { db.query(\`SET search_path = \${req.app.locals.schema}\`) }`],

  // A two- or three-parameter function whose first parameter is named
  // `request` and is a request *description*, not an HTTP request: a retry
  // wrapper, an axios config, a queue job, an internal DTO, a client handle.
  // The heuristic checks name, index and arity, and all three hold.
  // Narrowing: N1.
  ['retry wrapper (request, attempts)', `
    async function sendWithRetry(request, attempts) {
      await db.query(\`INSERT INTO outbox (target) VALUES ('\${request.endpoint}')\`)
    }`],
  ['axios config (request, options)',
    `function trace(request, options) { return db.query(\`INSERT INTO calls (path) VALUES ('\${request.baseURL}')\`) }`],
  ['queue job (request, done)',
    `function work(request, done) { db.query(\`UPDATE jobs SET state = 'done' WHERE id = \${request.id}\`); done() }`],
  ['internal DTO (request, options), validated upstream',
    `function search(request, options) { return db.query(\`SELECT * FROM products WHERE category = '\${request.category}'\`) }`],
  ['a client passed as `req`',
    `async function warm(req, key) { return db.query(\`SELECT * FROM cache WHERE host = '\${req.options.host}'\`) }`],

  // The same heuristic inside a method, a hook or a test double.
  // Narrowing: N1.
  ['object method send(request, options)',
    `const api = { send(request, options) { return db.query(\`INSERT INTO outbox (kind) VALUES ('\${request.kind}')\`) } }`],
  ['class method send(request, options)',
    `class Client { send(request, options) { return db.query(\`INSERT INTO outbox (kind) VALUES ('\${request.kind}')\`) } }`],
  ['useCallback((request, options) => …)',
    `function useApi() { return useCallback((request, options) => db.query(\`SELECT * FROM u WHERE id = \${request.id}\`), []) }`],
  ['jest.fn fetch mock (request, init)',
    `global.fetch = jest.fn((request, init) => { db.query(\`INSERT INTO calls (kind) VALUES ('\${request.kind}')\`) })`],

  // A callback parameter shadowing `req` inside a real handler. The inner
  // binding is arity 2 at index 0, so it re-triggers the source on an array
  // element. Narrowing: N1.
  ['callback shadowing req inside a handler',
    `function handler(req, res) { return items.map((req, i) => db.query(\`SELECT * FROM u WHERE id = \${req.id}\`)) }`],

  // `.execute()` on something that is not a database. Command buses, state
  // machines and job runners all use the name. Narrowing: N2.
  ['commandBus.execute()',
    `function handler(req, res) { return commandBus.execute(\`RenameUser:\${req.body.name}\`) }`],
  ['machine.execute()',
    `function handler(req, res) { return machine.execute(\`transition:\${req.query.to}\`) }`],
  ['runner.execute()',
    `function handler(req, res) { return runner.execute(\`deploy --env \${req.query.env}\`) }`],

  // `.prepare()` on something that is not a database. This sink has no
  // receiver constraint at all, and better-sqlite3 is not the only library
  // using the word. Narrowing: N2.
  ['renderer.prepare()',
    `function handler(req, res) { return renderer.prepare(\`Hello \${req.body.name}\`) }`],
  ['mailer.prepare()',
    `function handler(req, res) { return mailer.prepare(\`Subject: \${req.body.subject}\`) }`],

  // `.query()` / `.raw()` on a non-SQL client: GraphQL clients, analytics
  // clients, HTTP query strings, i18n helpers. Narrowing: N2. (`client.query`
  // for GraphQL is a name collision N2 cannot resolve; it is at least an
  // injection of *some* kind, so mislabelling it is the lesser evil.)
  ['analytics.query()',
    `function handler(req, res) { return analytics.query(\`metric:visits,segment:\${req.query.segment}\`) }`],
  ['superagent .query() querystring',
    `function handler(req, res) { return superagent.get('/x').query('name=' + req.query.name) }`],
  ['i18n t.raw()',
    `function handler(req, res) { return t.raw(\`greeting.\${req.query.locale}\`) }`],

  // `exec` on a receiver whose name is in the sqlite allowlist but is not a
  // database. `client`, `handle` and `connection` are the weak entries: this
  // reports SQL injection on a *command* injection, which the registry note
  // for this sink says explicitly must not happen.
  // Narrowing: drop `client` and `handle` from the exec receiver pattern.
  // `db|database|sqlite\d?|conn|connection|pool|sql` keeps every real
  // better-sqlite3 usage, and both existing exec cases in test.js (`db`,
  // `sqlite`).
  ['child_process required into `client`',
    `function handler(req, res) { const client = require('child_process'); client.exec(\`ls \${req.query.dir}\`) }`],
  ['handle.exec() shell call',
    `function handler(req, res) { return handle.exec(\`ls \${req.query.dir}\`) }`],
  ['connection.exec() on a socket',
    `function handler(req, res) { return connection.exec(\`notify \${req.query.channel}\`) }`],

  // The allowlist-guarded ternary: the canonical safe dynamic ORDER BY. The
  // rule reports it while staying quiet on the lookup-table version, so it
  // rejects the idiom people actually write. Narrowing: N3.
  ['ALLOWLIST.includes(v) ? v : default', `
    const SORTABLE = ['id', 'name', 'created_at']
    function handler(req, res) {
      const sort = SORTABLE.includes(req.query.sort) ? req.query.sort : 'id'
      db.query(\`SELECT * FROM u ORDER BY \${sort}\`)
    }`],

  // FIXED — the early-return allowlist guard now has flow sensitivity in the
  // taint layer: an allowlist membership guard over the exact expression, with
  // an abrupt negative consequent, clears the taint. Same proof bar as the
  // ternary form (foldable primitive collection).
  ['early-return allowlist guard', `
    const TABLES = ['users', 'orders']
    function handler(req, res) {
      const table = req.query.table
      if (!TABLES.includes(table)) return res.status(400).end()
      db.query(\`SELECT count(*) FROM \${table}\`)
    }`],

  // `this.query(...)` in a repository whose own `query` method parameterizes.
  // FIXED as a side effect of the receiver allowlist rather than by design:
  // `matchesReceiver` returns false for a ThisExpression, so this goes quiet
  // while `this.db.query(...)` keeps reporting. A deliberate trade, and it is
  // recorded as a limitation in the rule readme.
  ['this.query() in a repository',
    `class Repo { run(req, res) { return this.query(\`SELECT * FROM u WHERE id = \${req.query.id}\`) } }`],

  // A CLI script interpolating its own argv. FIXED, though not quite as
  // proposed: 0.55 was not enough, because prefix-matching source paths removed
  // the member-access penalty this estimate assumed. The source sits at 0.45,
  // below the default floor, so it is computed but not reported — lower
  // minConfidence to 0.3 for an audit pass and it reappears.
  ['CLI script interpolating process.argv',
    `const table = process.argv[2]; db.query(\`SELECT count(*) FROM \${table}\`)`],

]

describe('WAS FAILING — confirmed false positives, all fixed (see the comment above)', () => {
  for (const [name, code] of falsePositives)
    it(name, {}, () => test('security-no-sql-injection', { valid: [code], invalid: [] }))
})
