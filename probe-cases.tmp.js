module.exports = [

// === 1. `req` / `request` parameter name that is not an HTTP request =========

['redis client passed as `req`', `
async function cacheAndStore(req, key) {
  const cached = await req.get(key)
  return db.query('SELECT * FROM entries WHERE k = ' + cached)
}
`],

['array map callback named request', `
async function logPending(requests) {
  for (const [request, index] of requests.entries()) {
    await db.query(\`INSERT INTO audit (kind, position) VALUES ('\${request.kind}', \${index})\`)
  }
}
`],

['.map((request, index) => ...) over own domain objects', `
function insertAll(pendingRequests) {
  return Promise.all(pendingRequests.map((request, index) =>
    db.query(\`INSERT INTO audit (kind, position) VALUES ('\${request.kind}', \${index})\`)
  ))
}
`],

['.forEach((req, i) => ...)', `
function report(rows) {
  rows.forEach((req, i) => {
    db.query(\`UPDATE audit SET position = \${i} WHERE kind = '\${req.kind}'\`)
  })
}
`],

['fetch retry wrapper (request, attempts)', `
async function sendWithRetry(request, attempts) {
  await db.query(\`INSERT INTO outbox (target) VALUES ('\${request.url}')\`)
}
`],

['axios request config (request, options)', `
function trace(request, options) {
  return db.query(\`INSERT INTO calls (path) VALUES ('\${request.baseURL}')\`)
}
`],

['queue job named request (request, done)', `
function process(request, done) {
  db.query(\`UPDATE jobs SET state = 'done' WHERE id = \${request.id}\`)
  done()
}
`],

['internal DTO named request, validated upstream', `
function search(request, options) {
  return db.query(\`SELECT * FROM products WHERE category = '\${request.category}'\`)
}
`],

['mock request object in a test (variable, not param)', `
const req = { query: { id: '1' }, params: {} }
db.query(\`SELECT * FROM users WHERE id = \${req.query.id}\`)
`],

['test helper building a fake req', `
function makeReq(query, params) {
  return { query, params }
}
function seed(req, res) {
  db.query('SELECT 1')
}
`],

['nested callback shadowing outer req (arity 1)', `
function handler(req, res) {
  ids.forEach(req => db.query(\`SELECT * FROM u WHERE id = \${req}\`))
}
`],

['Next.js route handler GET(request) - arity 1, genuinely untrusted (FALSE NEGATIVE check)', `
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id')
  return db.query(\`SELECT * FROM u WHERE id = \${id}\`)
}
`],

['Cloudflare Worker fetch(request, env, ctx) - genuinely untrusted (TRUE POSITIVE check)', `
export default {
  async fetch(request, env, ctx) {
    return env.DB.prepare(\`SELECT * FROM u WHERE path = '\${request.url}'\`)
  }
}
`],

['GraphQL context param named request', `
const resolvers = {
  Query: {
    me(parent, args, context) {
      return db.query(\`SELECT * FROM u WHERE id = \${context.userId}\`)
    }
  }
}
`],

['middleware factory returning a real handler (TRUE POSITIVE check)', `
function requireRole(role) {
  return function (req, res, next) {
    db.query(\`SELECT * FROM roles WHERE name = '\${req.query.role}'\`)
  }
}
`],

// === 2. Method-name sinks on things that are not databases ==================

['RegExp.prototype.exec', `
const re = /^[a-z]+$/
function check(value) {
  return re.exec(value)
}
`],

['RegExp exec with a tainted string', `
function handler(req, res) {
  const re = /(\\d+)/
  return re.exec(req.query.id)
}
`],

['regex variable literally named `pattern`, tainted input', `
function handler(req, res) {
  return pattern.exec(req.body.text)
}
`],

['a regex held in a variable named `client` (contrived but receiver matches)', `
function handler(req, res) {
  const client = /(\\d+)/
  return client.exec(req.query.id)
}
`],

['document.querySelector with interpolation', `
function handler(req, res) {
  return document.querySelector(\`[data-id="\${req.query.id}"]\`)
}
`],

['Apollo client.query with a variables object', `
function handler(req, res) {
  return client.query({ query: USER_QUERY, variables: { id: req.query.id } })
}
`],

['graphql-request style client.query with interpolated query string', `
function handler(req, res) {
  return client.query(\`{ user(id: "\${req.query.id}") { name } }\`)
}
`],

['analytics client .query with interpolated segment', `
function handler(req, res) {
  return analytics.query(\`metric:visits,segment:\${req.query.segment}\`)
}
`],

['state machine .execute', `
function handler(req, res) {
  return machine.execute(\`transition:\${req.query.to}\`)
}
`],

['job runner .execute', `
function handler(req, res) {
  return runner.execute(\`deploy --env \${req.query.env}\`)
}
`],

['CLI command bus .execute with a command string', `
function handler(req, res) {
  return commandBus.execute(\`RenameUser:\${req.body.name}\`)
}
`],

['template renderer .prepare', `
function handler(req, res) {
  return renderer.prepare(\`Hello \${req.body.name}\`)
}
`],

['mailer .prepare', `
function handler(req, res) {
  return mailer.prepare(\`Subject: \${req.body.subject}\`)
}
`],

['next app .prepare()', `
function handler(req, res) {
  return app.prepare()
}
`],

['mongoose query .exec() at end of chain', `
function handler(req, res) {
  return Model.find({ name: req.query.name }).exec()
}
`],

['child_process exec via a variable named `client` (mis-typed report check)', `
function handler(req, res) {
  const client = require('child_process')
  client.exec(\`ls \${req.query.dir}\`)
}
`],

// === 3. Values that only look untrusted =====================================

['zod parse result', `
function handler(req, res) {
  const { id } = schema.parse(req.query)
  db.query(\`SELECT * FROM u WHERE id = \${id}\`)
}
`],

['zod safeParse .data', `
function handler(req, res) {
  const parsed = schema.safeParse(req.query)
  if (!parsed.success) return res.status(400).end()
  db.query(\`SELECT * FROM u WHERE id = \${parsed.data.id}\`)
}
`],

['joi validate value', `
function handler(req, res) {
  const { value } = schema.validate(req.query)
  db.query(\`SELECT * FROM u WHERE id = \${value.id}\`)
}
`],

['allowlist includes() guard then interpolate', `
const SORTABLE = ['id', 'name', 'created_at']
function handler(req, res) {
  const sort = SORTABLE.includes(req.query.sort) ? req.query.sort : 'id'
  db.query(\`SELECT * FROM u ORDER BY \${sort}\`)
}
`],

['allowlist lookup table', `
const COLUMN = { id: 'id', name: 'name' }
function handler(req, res) {
  const column = COLUMN[req.query.sort] || 'id'
  db.query(\`SELECT * FROM u ORDER BY \${column}\`)
}
`],

['direction mapped to two constants', `
function handler(req, res) {
  const direction = req.query.dir === 'asc' ? 'ASC' : 'DESC'
  db.query(\`SELECT * FROM u ORDER BY id \${direction}\`)
}
`],

['early-return guard against allowlist', `
const TABLES = ['users', 'orders']
function handler(req, res) {
  const table = req.query.table
  if (!TABLES.includes(table)) return res.status(400).end()
  db.query(\`SELECT count(*) FROM \${table}\`)
}
`],

['req.user from verified JWT / passport', `
function handler(req, res) {
  db.query(\`SELECT * FROM orders WHERE user_id = \${req.user.id}\`)
}
`],

['req.session server-side state', `
function handler(req, res) {
  db.query(\`SELECT * FROM carts WHERE session = '\${req.session.id}'\`)
}
`],

['req.app.locals config', `
function handler(req, res) {
  db.query(\`SET search_path = \${req.app.locals.schema}\`)
}
`],

['config object', `
const config = require('./config')
db.query(\`SET statement_timeout = \${config.timeoutMs}\`)
`],

['enum constant', `
const Status = { active: 'active', archived: 'archived' }
db.query(\`SELECT * FROM u WHERE status = '\${Status.active}'\`)
`],

['process.env', `
db.query(\`SET search_path = \${process.env.PG_SCHEMA}\`)
`],

['database result reused in a second query', `
async function backfill() {
  const { rows } = await db.query('SELECT id FROM users')
  await db.query(\`UPDATE stats SET n = \${rows.length}\`)
}
`],

['hardcoded table name in a migration', `
exports.up = function (knex) {
  const table = 'users'
  return knex.raw(\`ALTER TABLE \${table} ADD COLUMN nickname text\`)
}
`],

['seed script with literal data', `
const seeds = ['alice', 'bob']
for (const name of seeds) db.query(\`INSERT INTO users (name) VALUES ('\${name}')\`)
`],

['CLI tool with process.argv', `
const table = process.argv[2]
db.query(\`SELECT count(*) FROM \${table}\`)
`],

['CLI tool with coerced argv', `
const limit = Number(process.argv[2])
db.query(\`SELECT * FROM users LIMIT \${limit}\`)
`],

// === 4. Idiomatic safe query building =======================================

['IN (...) with a fixed count of placeholders', `
function handler(req, res) {
  const ids = req.body.ids
  const placeholders = ids.map((_, i) => '$' + (i + 1)).join(', ')
  db.query(\`SELECT * FROM users WHERE id IN (\${placeholders})\`, ids)
}
`],

['IN (...) via Array.fill', `
function handler(req, res) {
  const ids = req.body.ids
  const placeholders = new Array(ids.length).fill('?').join(', ')
  db.query(\`SELECT * FROM users WHERE id IN (\${placeholders})\`, ids)
}
`],

['ORDER BY from an allowlist object lookup', `
const ORDER = { newest: 'created_at DESC', name: 'name ASC' }
function handler(req, res) {
  db.query(\`SELECT * FROM u ORDER BY \${ORDER[req.query.sort] ?? ORDER.newest}\`)
}
`],

['escapeId identifier quoting', `
function handler(req, res) {
  const column = mysql.escapeId(req.query.sort)
  db.query(\`SELECT * FROM u ORDER BY \${column}\`)
}
`],

['knex query builder chain, no raw', `
function handler(req, res) {
  return knex('users').where({ id: req.query.id }).orderBy('id')
}
`],

['pagination with Number() coercion', `
function handler(req, res) {
  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0
  db.query(\`SELECT * FROM u LIMIT \${limit} OFFSET \${offset}\`)
}
`],

['pagination with parseInt and clamp', `
function handler(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
  db.query(\`SELECT * FROM u LIMIT \${limit}\`)
}
`],

['WHERE 1=1 accumulator of constant fragments', `
function handler(req, res) {
  const values = []
  let sql = 'SELECT * FROM users WHERE 1=1'
  if (req.query.name) { values.push(req.query.name); sql += \` AND name = $\${values.length}\` }
  if (req.query.city) { values.push(req.query.city); sql += \` AND city = $\${values.length}\` }
  return db.query(sql, values)
}
`],

['conditional fragments joined', `
function handler(req, res) {
  const where = []
  if (req.query.name) where.push('name = ?')
  if (req.query.city) where.push('city = ?')
  const sql = 'SELECT * FROM users' + (where.length ? ' WHERE ' + where.join(' AND ') : '')
  return db.query(sql, [req.query.name, req.query.city].filter(Boolean))
}
`],

['prepared statement, parameters on run()', `
function handler(req, res) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(req.params.id)
}
`],

['sequelize with bind', `
function handler(req, res) {
  return sequelize.query('SELECT * FROM u WHERE id = $1', { bind: [req.query.id] })
}
`],

['drizzle sql tagged template', `
function handler(req, res) {
  return db.execute(sql\`SELECT * FROM users WHERE id = \${req.query.id}\`)
}
`],

['column list from a constant array', `
const COLUMNS = ['id', 'name', 'email']
function handler(req, res) {
  return db.query(\`SELECT \${COLUMNS.join(', ')} FROM users\`)
}
`],

// === 5. Fixtures, mocks, literal SQL in tests ===============================

['test fixture with literal SQL and a fake req', `
const fixtures = {
  req: { query: { id: '1' } },
  sql: 'SELECT * FROM users WHERE id = 1',
}
function setup(req, res) {
  return db.query(fixtures.sql)
}
`],

['supertest-ish helper (req, res) writing constant SQL', `
async function withUser(req, res) {
  await db.query("INSERT INTO users (name) VALUES ('test')")
}
`],

['jest mock of a db client', `
const db = { query: jest.fn() }
function handler(req, res) {
  db.query('SELECT 1')
}
`],

// === 6. Shadowing and scope ================================================

['module-level const req that is a redis client', `
const req = createClient()
db.query(\`SELECT * FROM cache WHERE host = '\${req.host}'\`)
`],

['inner function reusing the name with different arity', `
function outer(a, b) {
  function inner(req) {
    return db.query(\`SELECT * FROM u WHERE id = \${req.id}\`)
  }
  return inner(a)
}
`],

['shadowed req inside a real handler (inner wins, arity 2)', `
function handler(req, res) {
  return items.map((req, i) => db.query(\`SELECT * FROM u WHERE id = \${req.id}\`))
}
`],

['class method named query on a repository', `
class UserRepo {
  query(name, options) {
    return this.db.query('SELECT * FROM users WHERE name = $1', [name])
  }
}
`],

['this.query on a class (no heap model)', `
class Repo {
  run(req, res) {
    return this.query(\`SELECT * FROM u WHERE id = \${req.query.id}\`)
  }
}
`],

]
