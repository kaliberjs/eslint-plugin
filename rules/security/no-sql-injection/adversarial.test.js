const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

/**
 * Adversarial corpus for no-sql-injection.
 *
 * Every case here was run against the real rule before being written down.
 *
 *   invalid  -> the evasion is DETECTED. It is a regression test: this shape
 *               must keep being reported.
 *   valid    -> the evasion is MISSED. The comment states the real
 *               vulnerability that goes unreported.
 *
 * A `valid` case in this file is never a claim that the code is safe. It is a
 * record of a false negative. Nothing here was weakened to make it pass.
 *
 * ---------------------------------------------------------------------------
 *
 * The corpus was written against the first implementation and found 85 misses.
 * 35 of them are now fixed and have moved into `invalid`, each marked
 * "Was a recorded miss; now detected." The fixes were, roughly in order of how
 * many cases each closed:
 *
 *   - The request source is path-qualified and no longer gates on the handler
 *     signature, so `(err, req, res, next)` error middleware, arity-1 and
 *     arity-5 handlers all work.
 *   - The multi-write penalty dropped from 0.15 to 0.08, which brought the
 *     whole `let x = default; if (input) x = input` family back above the
 *     reporting floor. Those were the worst misses in the corpus: the analysis
 *     found the flow, computed a confidence, and then discarded it silently.
 *   - Global-rooted propagators (`String`, `decodeURIComponent`, `decodeURI`,
 *     `encodeURI`, `unescape`), which the registry previously had no way to
 *     express at all.
 *   - `split`, `toLocaleLowerCase`, `toLocaleUpperCase`, `flat`, and `join`'s
 *     separator argument.
 *   - The `all`/`get`/`run`/`each` sink family, and `location` reached via
 *     `window`, `document`, `self` or `globalThis`.
 *   - Parameter reassignment, restoring `req = req.body`.
 *
 * One case went the other way, and it is a judgement call rather than a
 * regression: `process.argv` interpolated into SQL is no longer reported at
 * default settings. The false-positive corpus argued a CLI tool interpolating
 * its own argv is an accepted risk — whoever runs it already controls the
 * database connection — so that source now sits at 0.45, just below the
 * default floor. It is computed, not discarded: `minConfidence: 0.3` brings it
 * back. Marked "NO LONGER REPORTED" below.
 */

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-sql-injection', merge(
  {
    valid: [
    ],
    invalid: [
      // Sequence expression and comma operator: unwrap() takes the last value.
      {
              code: handler(`db.query((0, 'SELECT * FROM u WHERE id = ' + req.query.id))`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`db.query((console.log(1), 'SELECT * FROM u WHERE id = ' + req.query.id))`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Optional call on an optional member: still a MemberExpression callee.
      {
              code: handler(`db?.query?.(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Computed sink name that folds to a constant.
      {
              code: handler(`const m = 'query'; db[m](\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Double rest: taint survives two destructuring hops.
      {
              code: handler(`const { a, ...rest } = req.query; const { b, ...more } = rest; db.query(\`SELECT \${more.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Array destructuring of a tainted container.
      {
              code: handler(`const [first] = req.body.ids; db.query('SELECT * FROM u WHERE id = ' + first)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Write from inside a callback body.
      {
              code: handler(`let sql; [1].forEach(() => { sql = 'SELECT * FROM u WHERE id = ' + req.query.id }); db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Reassigning the request parameter itself.
      {
              code: `function handler(req, res) { req = req.body; db.query('SELECT * FROM u WHERE id = ' + req.id) }`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // The source read happens in a nested function / a callback.
      {
              code: `function handler(req, res) { function inner() { db.query('SELECT ' + req.query.id) } inner() }`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: `function handler(req, res) { [1].forEach(() => db.query('SELECT ' + req.query.id)) }`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Branch statements: try/catch, switch, do/while all reduce to writes.
      {
              code: handler(`let sql = 'SELECT 1'; try { sql = 'SELECT ' + req.query.id } catch (e) { sql = 'SELECT 2' } db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`let o = 'id'; switch (req.query.o) { case 'a': o = req.query.o; break } db.query(\`SELECT * FROM u ORDER BY \${o}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`let sql = 'SELECT 1'; do { sql = 'SELECT ' + req.query.id } while (false); db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // for-in over the query object: the *keys* are attacker-controlled too.
      {
              code: handler(`let sql = ''; for (const k in req.query) { sql = 'SELECT * FROM u ORDER BY ' + k } db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`for (const v of req.body.ids) db.query(\`SELECT * FROM u WHERE id = \${v}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Accumulating inside a loop *is* reported when the tainted read happens
      // in the loop body — the documented loop limitation is narrower than it
      // sounds (it is about taint arriving on a later iteration).
      {
              code: handler(`let sql = 'SELECT * FROM u WHERE '; for (const k of Object.keys(req.query)) sql += \`\${k} = '\${req.query[k]}' \`; db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Multi-filter += builder: the textbook shape, and the one the
      // isReadWrite() carve-out in combineWrites exists to keep reportable.
      {
              code: handler(`let sql = 'SELECT * FROM u WHERE 1=1'; if (req.query.a) sql += \` AND a='\${req.query.a}'\`; if (req.query.b) sql += \` AND b='\${req.query.b}'\`; db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`let sql = 'SELECT * FROM u'; sql += ' WHERE 1=1'; if (req.query.a) sql = sql + ' AND a=' + req.query.a; db.query(sql)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Template literal built, then a propagator method called on it.
      {
              code: handler(`db.query('SELECT * FROM ' + \`\${req.query.t}\`.trim())`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Nested templates, both interpolations tainted.
      {
              code: handler(`db.query(\`SELECT \${\`\${req.query.a}\${req.query.b}\`}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // `&&` where the tainted value is on the right of a guard.
      {
              code: handler(`const a = req.query.a; db.query('SELECT * FROM u WHERE a = ' + (a !== undefined && a))`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`db.query(\`SELECT \${1 && req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // A typeof guard is not a sanitizer, and correctly does not act as one.
      {
              code: handler(`const id = req.query.id; db.query(\`SELECT \${typeof id === 'string' ? id : ''}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Propagators reached through less common routes.
      {
              code: handler(`db.query('SELECT * FROM u WHERE a = ' + 'x'.replace('x', req.query.a))`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`db.query('SELECT * FROM u WHERE a = ' + ''.concat(req.query.a))`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`db.query('SELECT * FROM u WHERE a = ' + req.query.a.normalize())`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`db.query('SELECT * FROM u WHERE a = ' + req.query.a.at(0))`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Numeric coercion of one part does not clean the other part.
      {
              code: handler(`const n = Number(req.query.n); db.query('SELECT * FROM u LIMIT ' + n + req.query.x)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
    ],
  },

  {
    valid: [
      // NO LONGER REPORTED — see the note on this case.
      {
              code: `db.query('SELECT * FROM u WHERE id = ' + process.argv[2])`
            },
    ],
    invalid: [
      // Fastify names its request parameter `request`.
      {
              code: `async function route(request, reply) { db.query(\`SELECT * FROM u WHERE id = \${request.query.id}\`) }`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Next.js API route.
      {
              code: `export default function handler(req, res) { db.query(\`SELECT * FROM u WHERE id = \${req.query.id}\`) }`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Headers and cookies are as untrusted as the query string.
      {
              code: handler(`db.query(\`SELECT * FROM u WHERE host = '\${req.headers.host}'\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`db.query(\`SELECT * FROM s WHERE id = '\${req.cookies.session}'\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Browser globals through a propagator and through an alias.
      {
              code: `const id = location.hash.slice(1); db.query(\`SELECT * FROM u WHERE id = \${id}\`)`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: `const l = location; db.query(\`SELECT * FROM u WHERE u = '\${l.href}'\`)`,
              errors: [{ messageId: 'sqlInjection' }],
            },
      // Cloudflare D1 and better-sqlite3 handles.
      {
              code: handler(`env.DB.prepare(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`this.db.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`sqlite3.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // Drizzle / mysql2 execute.
      {
              code: handler(`db.execute(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS: `?size=1 UNION SELECT password FROM users--` reaches
      // the query string unreported. `size` is in nonPropagatingProperties, so
      // resolveMember returns null before ever looking at the object.
      handler(`db.query('SELECT * FROM t LIMIT ' + req.query.size)`),
      // ADVERSARIAL MISS: same for `length`. `?length=1 OR 1=1` is unreported.
      handler(`db.query('SELECT * FROM t LIMIT ' + req.body.length)`),
      // ADVERSARIAL MISS: via an alias, identically missed.
      handler(`const q = req.query; db.query('SELECT * FROM t LIMIT ' + q.size)`),
      // ADVERSARIAL MISS: and via destructuring — resolveDestructured runs the
      // same name check over the whole pattern path.
      handler(`const { size } = req.query; db.query(\`SELECT * FROM t LIMIT \${size}\`)`),
      // ADVERSARIAL MISS: `?constructor=...` — obscure as a parameter name, but
      // it demonstrates the mechanism is name-based and unconditional.
      handler(`db.query('SELECT * FROM t WHERE a = ' + req.body.constructor)`),
    ],
    invalid: [
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS: trimLeft/trimRight (the legacy aliases of
      // trimStart/trimEnd, still widely used) are absent.
      handler(`db.query('SELECT * FROM ' + req.query.t.trimLeft())`),
      // ADVERSARIAL MISS: JSON.stringify of a tainted object. Quotes are
      // escaped for JSON, not for SQL, and the value lands unquoted here.
      handler(`db.query('SELECT * FROM u WHERE meta = ' + JSON.stringify(req.body.meta))`),
      // ADVERSARIAL MISS: Array.from / map / flat over tainted input.
      handler(`db.query('SELECT * FROM u WHERE id IN (' + Array.from(req.body.ids).join(',') + ')')`),
      handler(`db.query('SELECT * FROM u WHERE id IN (' + req.body.ids.map(x => x).join(',') + ')')`),
    ],
    invalid: [
      // ADVERSARIAL MISS: `String(x)` is the single most common string coercion
      // in JavaScript and is neither a sanitizer nor a propagator, so it reads
      // as a wall. `?id=1 OR 1=1` unreported.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM u WHERE id = ' + String(req.query.id))`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: `decodeURIComponent` is extremely common on request
      // input and propagates taint perfectly (it can only *add* metacharacters).
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM u WHERE id = ' + decodeURIComponent(req.query.id))`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: `encodeURI` likewise — and unlike
      // encodeURIComponent it does not even encode a single quote.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query(\`SELECT * FROM u WHERE n = '\${encodeURI(req.query.n)}'\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: `split` is missing, which breaks the whole
      // `split(',').join("','")` IN-list idiom — a classic injection shape.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query(\`SELECT * FROM u WHERE id IN ('\${req.query.ids.split(',').join("','")}')\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: split also breaks array destructuring of its result.
      // Was a recorded miss; now detected.
      {
        code: handler(`const [first] = req.query.t.split(','); db.query('SELECT * FROM ' + first)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: and indexing its result.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM ' + req.query.t.split(',')[0])`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: toLowerCase/toUpperCase are in the table, their
      // locale-aware twins are not. Casing does not remove `OR 1=1`.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM ' + req.query.t.toLocaleUpperCase())`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM ' + req.query.t.toLocaleLowerCase())`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: `join` propagates its receiver but declares
      // `args: 'none'`, so a tainted *separator* is dropped.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM u WHERE a IN (' + ['1', '2'].join(req.query.sep) + ')')`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Was a recorded miss; now detected.
      {
        code: handler(`db.query('SELECT * FROM u WHERE id IN (' + req.body.ids.flat().join(',') + ')')`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS (confidence 0.41, dropped): a chain of five
      // normalisation methods, none of which is a SQL escaper. Every hop is
      // *exactly* understood, yet the sum of the modelling penalties buries it.
      handler(`db.query('SELECT * FROM ' + req.query.t.trim().toLowerCase().slice(0, 10).padStart(2, '0').normalize())`),
    ],
    invalid: [
      // ADVERSARIAL MISS (confidence 0.46, dropped): the canonical dynamic
      // WHERE clause. `?name=x' OR '1'='1` is a complete authentication
      // bypass, computed and discarded.
      // Was a recorded miss; now detected.
      {
        code: handler(`let where = '1=1'; if (req.query.name) where = 'name = ' + req.query.name; db.query('SELECT * FROM u WHERE ' + where)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS (confidence 0.46, dropped): same shape with template
      // literals instead of concatenation.
      // Was a recorded miss; now detected.
      {
        code: handler(`let where = ''; if (req.query.name) where = \`name = '\${req.query.name}'\`; db.query(\`SELECT * FROM users WHERE \${where}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS (confidence 0.43, dropped): `x = input ? input : default`
      // — a reassignment plus a ternary. ORDER BY cannot be parameterized, so
      // this is exactly where real injections live.
      // Was a recorded miss; now detected.
      {
        code: handler(`let o = 'id'; o = req.query.o ? req.query.o : 'id'; db.query(\`SELECT * FROM u ORDER BY \${o}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS (confidence 0.43, dropped): the `??` variant.
      // Was a recorded miss; now detected.
      {
        code: handler(`let o = 'id'; if (req.query.o) o = req.query.o ?? 'id'; db.query(\`SELECT * FROM u ORDER BY \${o}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS (confidence 0.43, dropped): guarded assignment plus a
      // defensive ternary at the sink. Two "defensive" idioms, stacked, buy
      // enough penalty to hide a real bug.
      // Was a recorded miss; now detected.
      {
        code: handler(`let w = '1=1'; if (req.body.f) w = req.body.f; db.query(\`SELECT * FROM u WHERE \${w ? w : '1=1'}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS (confidence 0.46, dropped): calling `.trim()` on the
      // input — which does nothing for SQL — costs 0.05 and drops the finding.
      // Was a recorded miss; now detected.
      {
        code: handler(`let o = 'id'; if (req.query.o) o = req.query.o.trim(); db.query('SELECT * FROM u ORDER BY ' + o)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS (confidence 0.48, dropped): a dynamic column name read
      // with a computed key.
      // Was a recorded miss; now detected.
      {
        code: handler(`let k = 'a'; if (req.query.k) k = req.query[req.query.k]; db.query(\`SELECT * FROM u WHERE \${k} = 1\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // The other side of the same floor. These are the same shape and land at
      // 0.51-0.61: one 0.02 member hop away from being dropped. They are here
      // so that any future penalty tweak shows up as a diff in this file.
      {
              code: handler(`let where; if (req.query.name) where = \`name = '\${req.query.name}'\`; db.query(\`SELECT * FROM u WHERE \${where}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`let t = 'users'; if (req.query.t) t = req.query.t; db.query(\`SELECT * FROM \${t}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`let dir = 'ASC'; if (req.query.dir) dir = req.query.dir; db.query(\`SELECT * FROM u ORDER BY id \${dir}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      {
              code: handler(`const o = req.query.o; let dir = 'ASC'; if (o) dir = o; db.query(\`SELECT * FROM u ORDER BY id \${dir}\`)`),
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
      // A browser source starts at 0.9, so the identical shape that is dropped
      // for Express survives here. The floor is a source-confidence lottery,
      // not a property of the flow.
      {
              code: `let o = 'id'; if (location.hash) o = location.hash; db.query(\`SELECT * FROM u ORDER BY \${o ? o : 'id'}\`)`,
              errors: [{ messageId: 'sqlInjectionQualified' }],
            },
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS: TypeORM's query builder takes raw SQL fragments in
      // .where/.andWhere/.orderBy/.having. This is one of the most frequently
      // exploited ORM escape hatches in the wild.
      handler(`qb.where('id = ' + req.query.id).andWhere('a = ' + req.query.a)`),
      // ADVERSARIAL MISS: Sequelize.literal injects a raw fragment.
      handler(`sequelize.literal(\`id = \${req.query.id}\`)`),
      // ADVERSARIAL MISS: mysql2 / pg-query-stream streaming variants.
      handler(`pool.queryStream(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      handler(`dbConn.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`)`),
      // ADVERSARIAL MISS: pg's object call form. `client.query({ text, values })`
      // is documented pg usage; the rule reads argument 0, finds an
      // ObjectExpression, and resolve() falls through to `default: return null`.
      // The *safe* object form is asserted valid in test.js — the unsafe one
      // looks identical to the analysis.
      handler(`db.query({ text: 'SELECT * FROM u WHERE id = ' + req.query.id })`),
      handler(`db.query({ text: \`SELECT * FROM u WHERE id = \${req.query.id}\`, values: [] })`),
      // ADVERSARIAL MISS: sinkAt() requires callee to be a MemberExpression
      // literally, with no unwrap(), so a sequence-wrapped or .call/.apply
      // invocation of the same method is not a sink.
      handler(`(0, db.query)(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      handler(`db.query.call(db, \`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      handler(`db.query.apply(db, [\`SELECT * FROM u WHERE id = \${req.query.id}\`])`),
      // ADVERSARIAL MISS: a destructured or bound method is a bare call, and
      // bare calls are deliberately not sinks. `const { query } = pool` is
      // ordinary code.
      handler(`const { query } = pool; query(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      handler(`const q = db.query.bind(db); q(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      // ADVERSARIAL MISS: a non-foldable computed sink name.
      handler(`db[req.query.m](\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      // ADVERSARIAL MISS: spread into the sink. arguments[0] is a SpreadElement.
      handler(`const sql = 'SELECT * FROM u WHERE id = ' + req.query.id; db.query(...[sql])`),
    ],
    invalid: [
      // ADVERSARIAL MISS: sqlite3's own primary API. `db.all`, `db.get`,
      // `db.run` and `db.each` all take raw SQL, are far more common in
      // sqlite3/better-sqlite3 code than `exec`, and none is a registered sink.
      // Was a recorded miss; now detected.
      {
        code: handler(`db.all(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Was a recorded miss; now detected.
      {
        code: handler(`db.get(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Was a recorded miss; now detected.
      {
        code: handler(`db.run(\`DELETE FROM u WHERE id = \${req.query.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Was a recorded miss; now detected.
      {
        code: handler(`db.each(\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: the receiver constraint on `exec` misses real
      // handles. `sql.exec()` is the Cloudflare Durable Objects SQLite API
      // (`this.ctx.storage.sql.exec(...)`), which cannot be parameterized by
      // string and is a current, shipping API.
      // Was a recorded miss; now detected.
      {
        code: handler(`sql.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: and other everyday handle names — `pool`, `dbConn`,
      // `knexDb` — all fail /^(db|database|sqlite\d?|conn|connection|client|handle)$/i.
      // Was a recorded miss; now detected.
      {
        code: handler(`pool.exec(\`DELETE FROM u WHERE id = \${req.query.id}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS: Koa/Hono pass a context object named `ctx`/`c`, which
      // no source matches. Koa is a first-class Node framework and the readme's
      // registry note even mentions "Koa-style" handlers.
      `async function mw(ctx, next) { db.query('SELECT * FROM u WHERE id = ' + ctx.query.id) }`,
      `async function route(c) { db.query('SELECT * FROM u WHERE id = ' + c.req.query('id')) }`,
      // ADVERSARIAL MISS: AWS Lambda / API Gateway event object.
      `exports.handler = async (event, context) => { db.query('SELECT * FROM u WHERE id = ' + event.queryStringParameters.id) }`,
      // ADVERSARIAL MISS: URLSearchParams is how query strings are actually
      // read in the browser. The constructor is an unknown call, so the taint
      // from location.search dies at `new URLSearchParams(...)`.
      `const p = new URLSearchParams(location.search); db.query(\`SELECT * FROM u WHERE id = \${p.get('id')}\`)`,
    ],
    invalid: [
      // ADVERSARIAL MISS: Express error-handling middleware has arity 4 and
      // `req` at index 1. The source rule pins index 0 and arity [2, 3], so
      // every error handler in every Express app is invisible.
      // Was a recorded miss; now detected.
      {
        code: `function mw(err, req, res, next) { db.query('SELECT * FROM u WHERE id = ' + req.query.id) }`,
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // Was a recorded miss; now detected.
      {
        code: `app.use((err, req, res, next) => { db.query('SELECT * FROM u WHERE id = ' + req.query.id) })`,
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: a handler that only declares the parameters it uses.
      // Arity 1 is outside [2, 3].
      // Was a recorded miss; now detected.
      {
        code: `app.get('/x', (req) => db.query(\`SELECT * FROM u WHERE id = \${req.query.id}\`))`,
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: extra trailing parameters (arity 5) also fall out.
      // Was a recorded miss; now detected.
      {
        code: `function mw(req, res, next, a, b) { db.query('SELECT ' + req.query.id) }`,
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
      // ADVERSARIAL MISS: `window.location.search` is the more common spelling
      // of the registered `location.search` source, and it matches nothing:
      // the only registered `window` path is `window.name`.
      // Was a recorded miss; now detected.
      {
        code: `db.query(\`SELECT * FROM u WHERE q = '\${window.location.search}'\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      // Was a recorded miss; now detected.
      {
        code: `const u = window.location.href; db.query(\`SELECT * FROM u WHERE u = '\${u}'\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      // ADVERSARIAL MISS: same for document.location, self.location and
      // globalThis.location.
      // Was a recorded miss; now detected.
      {
        code: `db.query(\`SELECT * FROM u WHERE h = '\${document.location.hash}'\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      // Was a recorded miss; now detected.
      {
        code: `db.query(\`SELECT * FROM u WHERE q = '\${self.location.search}'\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      // Was a recorded miss; now detected.
      {
        code: `db.query(\`SELECT * FROM u WHERE q = '\${globalThis.location.search}'\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      // ADVERSARIAL MISS: destructuring location off window.
      // Was a recorded miss; now detected.
      {
        code: `const { location } = window; db.query(\`SELECT * FROM u WHERE q = '\${location.search}'\`)`,
        errors: [{ messageId: 'sqlInjection' }],
      },
      // ADVERSARIAL MISS: with the browser globals actually declared, the
      // window-rooted spelling is still missed — this is a registry gap, not a
      // scope-resolution accident.
      // Was a recorded miss; now detected.
      {
              code: `db.query(\`SELECT * FROM u WHERE q = '\${window.location.search}'\`)`,
              languageOptions: { globals: browser },
              errors: [{ messageId: 'sqlInjection' }],
            },
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS: lodash `_.escape` is an HTML escaper. It does not
      // touch spaces, `=`, digits or keywords, so the payload `1 OR 1=1`
      // passes through completely unmodified into an unquoted value position.
      // Plainly exploitable, and silently marked sanitizedFor: sql.
      handler(`db.query('SELECT * FROM u WHERE id = ' + _.escape(req.query.id))`),
      // ADVERSARIAL MISS: validator.escape and he.escape, same story.
      handler(`db.query('SELECT * FROM u WHERE id = ' + validator.escape(req.query.id))`),
      handler(`db.query('SELECT * FROM u WHERE id = ' + he.escape(req.query.id))`),
      // ADVERSARIAL MISS: a regex escaper named `escape` escapes regex
      // metacharacters and leaves quotes entirely alone.
      handler(`db.query(\`SELECT * FROM u WHERE n = '\${re.escape(req.query.n)}'\`)`),
    ],
    invalid: [
    ],
  },

  {
    valid: [
      // ADVERSARIAL MISS: String.raw is a pure string builder. Not admitted in
      // Limitations.
      handler(`db.query(String.raw\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
      // ADVERSARIAL MISS: any unknown tag is assumed safe, so a project-local
      // `raw` / `dedent` / `stripIndent` tag hides the flow. (Arguably covered
      // by Limitation 3, unknown calls.)
      handler(`db.query(dedent\`SELECT * FROM u WHERE id = \${req.query.id}\`)`),
    ],
    invalid: [
    ],
  },

  {
    valid: [
      // Limitation 2 (containers): object round trip.
      handler(`const p = { id: req.query.id }; db.query('SELECT * FROM u WHERE id = ' + p.id)`),
      handler(`const p = Object.assign({}, req.query); db.query('SELECT * FROM u WHERE id = ' + p.id)`),
      handler(`const p = { ...req.query }; db.query('SELECT * FROM u WHERE id = ' + p.id)`),
      // Limitation 2: array round trip through a literal.
      handler(`const parts = ['SELECT * FROM u WHERE id =', req.query.id]; db.query(parts.join(' '))`),
      handler(`const parts = ['SELECT * FROM u WHERE 1=1']; if (req.query.a) parts.push('AND a=' + req.query.a); db.query(parts.join(' '))`),
      // Limitation 2: a getter.
      handler(`const o = { get id() { return req.query.id } }; db.query('SELECT * FROM u WHERE id = ' + o.id)`),
      // Limitation 3 (unknown calls): wrapper function, IIFE, callback.
      handler(`function build() { return \`SELECT * FROM u WHERE id = \${req.query.id}\` } db.query(build())`),
      handler(`db.query((() => 'SELECT * FROM u WHERE id = ' + req.query.id)())`),
      handler(`Promise.resolve(req.query.id).then(id => db.query(\`SELECT * FROM u WHERE id = \${id}\`))`),
      `async function handler(req, res) { const id = await Promise.resolve(req.query.id); db.query(\`SELECT \${id}\`) }`,
      // Limitation 1 (cross-file) / module round trips.
      `import { id } from './x'; db.query(\`SELECT * FROM u WHERE id = \${id}\`)`,
      `const id = location.search; module.exports.id = id; db.query(\`SELECT \${module.exports.id}\`)`,
      // Limitation 4 (destructured handler parameter).
      `function handler({ query }, res) { db.query('SELECT * FROM u WHERE id = ' + query.id) }`,
      `function handler({ query: { id } }, res) { db.query('SELECT * FROM u WHERE id = ' + id) }`,
      // Limitation 6 (class instance state).
      `class R { constructor(req) { this.req = req } run() { db.query('SELECT ' + this.req.query.id) } }`,
      `class R { constructor(req) { this.id = req.query.id } run() { db.query(\`SELECT \${this.id}\`) } }`,
      // An AssignmentExpression used as a value: resolve() has no case for it.
      handler(`let sql; db.query(sql = 'SELECT * FROM u WHERE id = ' + req.query.id)`),
    ],
    invalid: [
      // maxHops (12): a long alias chain bails out. Not a realistic shape, but
      // it pins where the ceiling is.
      // Was a recorded miss; now detected.
      {
        code: handler(`const a = req.query.id; const b = a; const c = b; const d = c; const e = d; const f = e; const g = f; const i = g; const j = i; const k = j; db.query(\`SELECT \${k}\`)`),
        errors: [{ messageId: 'sqlInjectionQualified' }],
      },
    ],
  },

  {
    valid: [
      // `0 && x` folds to 0. Not exploitable.
      handler(`db.query(\`SELECT * FROM u LIMIT \${0 && req.query.id}\`)`),
      // A whitelist lookup table: the tainted value is the key, and the result
      // can only be a developer-authored value.
      handler(`const dirs = { asc: 'ASC', desc: 'DESC' }; db.query(\`SELECT * FROM u ORDER BY id \${dirs[req.query.dir]}\`)`),
      // Shadowing: the inner `req` is a local object, not the parameter.
      `function handler(req, res) { { const req = { query: { id: 1 } }; db.query('SELECT ' + req.query.id) } }`,
      // mysql.format does the escaping itself.
      handler(`db.query(mysql.format('SELECT * FROM ?? WHERE 1', [req.query.t]))`),
      // Escaped output is quoted, so an unquoted interpolation position is
      // still safe.
      handler(`db.query(\`SELECT * FROM u WHERE id = \${mysql.escape(req.query.id)}\`)`),
    ],
    invalid: [
    ],
  },
))
