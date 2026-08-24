const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-sql-injection', merge(
  {
    // --- the vertical slice, both directions -----------------------------
    valid: [
      // Parameterized: the taint is in argument 1, and argument 1 is not the
      // sink. No special case in the rule makes this work.
      handler(`const id = req.query.id; db.query('SELECT * FROM users WHERE id = $1', [id])`),
      handler(`const id = req.query.id; db.query('SELECT * FROM users WHERE id = ?', [id])`),
      handler(`const id = req.query.id; conn.execute('SELECT * FROM users WHERE id = ?', [id])`),
      handler(`const id = req.query.id; knex.raw('select * from users where id = ?', [id])`),
      handler(`const id = req.query.id; sequelize.query('SELECT * FROM u WHERE id = :id', { replacements: { id } })`),

      // Object form: the query text is still a constant.
      handler(`const id = req.query.id; db.query({ text: 'SELECT * FROM users WHERE id = $1', values: [id] })`),
    ],
    invalid: [
      {
        code: handler(`const id = req.query.id; db.query(\`SELECT * FROM users WHERE id = \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const id = req.query.id; db.query('SELECT * FROM users WHERE id = ' + id)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    // --- sink coverage ----------------------------------------------------
    valid: [
      // Prisma's tagged-template APIs parameterize their interpolations. The
      // single most important false positive not to produce.
      handler('const id = req.query.id; prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`'),
      handler('const id = req.query.id; prisma.$executeRaw`DELETE FROM users WHERE id = ${id}`'),
      handler('const id = req.query.id; db.execute(sql`SELECT * FROM users WHERE id = ${id}`)'),
    ],
    invalid: [
      {
        code: handler(`const id = req.query.id; prisma.$queryRawUnsafe(\`SELECT * FROM users WHERE id = \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const id = req.query.id; prisma.$executeRawUnsafe('DELETE FROM users WHERE id = ' + id)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const t = req.body.table; knex.whereRaw(\`created_at > \${t}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const id = req.params.id; sqlite.prepare(\`SELECT * FROM u WHERE id = \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const id = req.params.id; sqlite.exec(\`DELETE FROM u WHERE id = \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    // --- propagation ------------------------------------------------------
    valid: [
      // Not a string-building operator.
      handler(`const n = req.query.n; db.query('SELECT * FROM t LIMIT ' + (n - 0))`),
      // Reading .length yields a number.
      handler(`const q = req.query.q; db.query('SELECT * FROM t LIMIT ' + q.length)`),
      // `tainted && safe` evaluates to the tainted value only when it is falsy.
      handler(`const f = req.query.f; db.query('SELECT * FROM t WHERE a = ' + (f && '1'))`),
    ],
    invalid: [
      // Alias chain.
      {
        code: handler(`const q = req.query; const id = q.id; db.query(\`SELECT \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Destructuring, nested and renamed and defaulted.
      {
        code: handler(`const { id } = req.query; db.query(\`SELECT \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const { query: { id: userId = '0' } } = req; db.query(\`SELECT \${userId}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Rest element keeps the taint.
      {
        code: handler(`const { a, ...rest } = req.query; db.query(\`SELECT \${rest.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Compound assignment: writeExpr is the RHS only, so a naive
      // last-write read would see a bare literal and miss this entirely.
      {
        code: handler(`let sql = 'SELECT * FROM u WHERE id = ' + req.query.id; sql += ' LIMIT 1'; db.query(sql)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Nested template literals.
      {
        code: handler(`const id = req.query.id; db.query(\`SELECT * FROM u WHERE id = \${\`\${id}\`}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Method propagators.
      {
        code: handler(`const ids = req.query.ids; db.query('SELECT * FROM u WHERE id IN (' + ids.join(',') + ')')`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      {
        code: handler(`const id = req.query.id; db.query('SELECT * FROM u WHERE id = '.concat(id))`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Ternary with one tainted branch.
      {
        code: handler(`const o = req.query.order; db.query(\`SELECT * FROM u ORDER BY \${o ? o : 'id'}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Nullish default does not sanitize.
      {
        code: handler(`const o = req.query.order ?? 'id'; db.query(\`SELECT * FROM u ORDER BY \${o}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Optional chaining and TS assertions are transparent.
      {
        code: handler(`const id = req.query?.id; db.query(\`SELECT \${id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Await is transparent.
      {
        code: `async function handler(req, res) { const b = await req.body; db.query(\`SELECT \${b.id}\`) }`,
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    // --- sanitizers, and their typing -------------------------------------
    valid: [
      // Coercion to a number cannot carry a payload in any sink language.
      handler(`const id = Number(req.query.id); db.query(\`SELECT * FROM u WHERE id = \${id}\`)`),
      handler(`const id = parseInt(req.query.id, 10); db.query(\`SELECT * FROM u WHERE id = \${id}\`)`),
      // A SQL escaper does clear sql.
      handler(`const n = mysql.escape(req.query.n); db.query('SELECT * FROM u WHERE n = ' + n)`),
      handler(`const c = mysql.escapeId(req.query.col); db.query('SELECT ' + c + ' FROM u')`),
      // An unknown function is a wall, not a low-confidence propagator.
      handler(`const id = transform(req.query.id); db.query(\`SELECT \${id}\`)`),
    ],
    invalid: [
      // A local `Number` shadows the global, so it is correctly *not* treated
      // as a sanitizer — but helper summaries now resolve the local body, and
      // an identity wrapper passes taint through untouched. This was recorded
      // in phase 1 as "becomes a true positive once call summaries exist";
      // that is exactly what happened.
      {
        code: `function handler(req, res) { const Number = x => x; const id = Number(req.query.id); db.query(\`SELECT \${id}\`) }`,
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // encodeURIComponent clears `url`, not `sql`. This is the whole point of
      // typing sanitization: no rule had to know this.
      {
        code: handler(`const n = encodeURIComponent(req.query.n); db.query('SELECT * FROM u WHERE n = ' + n)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // One unescaped interpolation ruins the query, even alongside an
      // escaped one.
      {
        code: handler(`const a = mysql.escape(req.query.a); const b = req.query.b; db.query(\`SELECT \${a} \${b}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    // --- false positives: safe code must stay clean -----------------------
    valid: [
      // No untrusted input anywhere. Developer-controlled identifiers.
      `const table = 'users'; db.query(\`SELECT * FROM \${table}\`)`,
      `const LIMIT = 10; db.query('SELECT * FROM users LIMIT ' + LIMIT)`,
      `db.query('SELECT * FROM users')`,
      `db.query(\`SELECT * FROM users\`)`,
      // Env config is not a request.
      `db.query('SET search_path = ' + process.env.SCHEMA)`,
      // Names that look tainted but are not.
      `function build(userId) { return db.query(\`SELECT * FROM u WHERE id = \${userId}\`) }`,
      `const query = 'SELECT 1'; db.query(query)`,
      // `req` is not a request object here: two params, but the sink argument
      // comes from a constant.
      `function handler(req, res) { db.query('SELECT 1') }`,
      // A method named query on something that is not a database still needs a
      // tainted argument to report.
      handler(`analytics.query({ metric: 'visits' })`),
      // Not a sink.
      handler(`const id = req.query.id; logger.info(\`user \${id}\`)`),
      // Sink with no arguments.
      handler(`db.query()`),
    ],
    invalid: [],
  },

  {
    // --- browser sources --------------------------------------------------
    valid: [],
    invalid: [
      {
        code: `const id = location.search; db.query(\`SELECT \${id}\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      {
        code: `const { hash } = location; db.query(\`SELECT \${hash}\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      {
        code: `db.query(\`SELECT \${document.referrer}\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
    ],
  },

  {
    // --- globals must resolve the same way whether or not the config declares
    // them. A declared global is a real Variable in the global scope, so
    // testing for an *unresolved* reference finds nothing — and silently
    // finding nothing is indistinguishable from being secure.
    valid: [
      {
        code: `const location = { search: 'x' }; db.query(\`SELECT \${location.search}\`)`,
        languageOptions: { globals: browser },
      },
      {
        code: `function handler(req, res) { db.query(\`SELECT \${Number(req.query.id)}\`) }`,
        languageOptions: { globals: browser },
      },
    ],
    invalid: [
      {
        code: `const id = location.search; db.query(\`SELECT \${id}\`)`,
        languageOptions: { globals: browser },
        errors: [{ messageId: 'sqlInjection' }],
      },
      {
        code: `db.query(\`SELECT \${document.referrer}\`)`,
        languageOptions: { globals: browser },
        errors: [{ messageId: 'sqlInjection' }],
      },
    ],
  },
))

test('security-no-sql-injection', {
  // --- name collisions. `exec` is shared with child_process, and reporting
  // "SQL injection" on a command injection is worse than reporting nothing.
  valid: [
    `const { exec } = require('child_process'); function handler(req, res) { exec(\`ls \${req.query.dir}\`) }`,
    `const cp = require('child_process'); function handler(req, res) { cp.exec(\`ls \${req.query.dir}\`) }`,
    `const childProcess = require('child_process'); function handler(req, res) { childProcess.exec(\`ls \${req.query.d}\`) }`,
    // A bare call is not a database handle method.
    `function handler(req, res) { query(\`SELECT \${req.query.id}\`) }`,
  ],
  invalid: [
    {
      code: `function handler(req, res) { db.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`) }`,
      errors: [{ messageId: 'sqlInjectionQualified' }],
    },
    {
      code: `function handler(req, res) { sqlite.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`) }`,
      errors: [{ messageId: 'sqlInjectionQualified' }],
    },
  ],
})
