# security-no-sql-injection

Detects untrusted input flowing into a raw SQL string.

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
- **CAPEC:** [CAPEC-66: SQL Injection](https://capec.mitre.org/data/definitions/66.html)
- **Severity:** high · **Confidence:** varies per finding, reported in the message

> The OWASP category is pinned to the 2021 edition deliberately. The 2025 edition
> renumbers Injection to A05, so an unsuffixed `A03` would silently change meaning.

## What it detects

A flow from a registered untrusted **source** to a registered SQL **sink**, where the
value reaches the sink as part of the query string rather than through the driver's
parameter channel.

```
req.query.id  ->  id  ->  `SELECT ... ${id}`  ->  db.query()
   source        alias      string building        sink
```

The rule is a thin consumer of the shared taint analysis in
`machinery/security/`. It contains no pattern matching beyond "is this call a SQL
sink" — everything about where the value came from is answered by the analysis.

## Why it matters

Concatenating untrusted input into SQL lets an attacker change the structure of the
query rather than just its values: reading other users' rows, bypassing
authentication, or dropping tables. Parameter binding sends the value to the database
out-of-band, where it can never be parsed as SQL.

## Incorrect

```js
function handler(req, res) {
  const id = req.query.id
  db.query(`SELECT * FROM users WHERE id = ${id}`)   // template interpolation
  db.query('SELECT * FROM users WHERE id = ' + id)   // concatenation
}
```

```js
// Prisma's explicitly-unsafe APIs take a plain string
prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${req.query.id}`)

// Knex raw escape hatches
knex.whereRaw(`created_at > ${req.body.since}`)

// better-sqlite3 exec() cannot be parameterized at all
db.exec(`DELETE FROM users WHERE id = ${req.params.id}`)
```

```js
// Accumulating into a query string. Reported: `+=` cannot remove the taint an
// earlier write introduced.
let sql = 'SELECT * FROM users WHERE id = ' + req.query.id
sql += ' LIMIT 1'
db.query(sql)
```

## Correct

```js
function handler(req, res) {
  const id = req.query.id

  db.query('SELECT * FROM users WHERE id = $1', [id])        // pg
  conn.execute('SELECT * FROM users WHERE id = ?', [id])     // mysql2
  knex.raw('select * from users where id = ?', [id])         // knex
  sequelize.query('SELECT * FROM u WHERE id = :id', { replacements: { id } })
}
```

No special case makes these clean: the taint is in argument 1, and argument 1 is not
the sink. A parameterized call simply leaves the query string untainted.

```js
// Prisma's tagged-template APIs parameterize their interpolations, so this is
// safe and is deliberately not flagged.
prisma.$queryRaw`SELECT * FROM users WHERE id = ${req.query.id}`
```

```js
// Coercion: the result cannot carry an injectable payload.
db.query(`SELECT * FROM users LIMIT ${Number(req.query.limit)}`)

// Identifier quoting — the one case parameter binding cannot cover.
db.query(`SELECT ${mysql.escapeId(req.query.column)} FROM users`)
```

## Sanitization is typed

A sanitizer clears specific *kinds*. `encodeURIComponent` clears `url`, not `sql`, so
this is still reported — correctly:

```js
const name = encodeURIComponent(req.query.name)
db.query('SELECT * FROM users WHERE name = ' + name)   // reported
```

Only operations whose result provably cannot be an injectable string in any language
(`Number`, `parseInt`, `parseFloat`, `BigInt`) clear every kind.

## Severity and confidence are separate

Severity is the impact if exploited; confidence is how sure the analysis is. Every
finding carries both, and the message states the confidence when it is not high.

| | confidence high | medium | low |
| --- | --- | --- | --- |
| **severity high** | reported (`error`) | reported (`warn`) | dropped |

Findings below `minConfidence` (default `0.5`) are computed but not reported. In
practice:

- A **browser global** source (`location`, `document.referrer`) is unambiguous and
  yields ~0.85 — high.
- An **HTTP request** source is matched by parameter name (`req` / `request`) plus the
  property accessed. The name half is a heuristic, so it is capped at 0.75, and
  findings rooted in it land in the 0.54–0.70 band — medium.

The property is part of the match, not incidental to it: `req.query`, `req.body`,
`req.params`, `req.headers`, `req.cookies`, `req.url` and friends are untrusted;
`req.user`, `req.session` and `req.app.locals` are not. Matching on the name alone
made the rule fire across every authenticated Express application.

## Configuration

The rule itself takes no options. The analysis is configured through shared settings:

```js
{
  settings: {
    '@kaliber/security': {
      minConfidence: 0.5,   // raise to 0.8 for a high-signal CI mode
      maxHops: 12,
      callDepth: 0,         // interprocedural analysis, off by default

      // Extend the knowledge base. Consumer entries take precedence.
      registry: {
        sinks: [
          { id: 'my.orm.rawQuery', root: { method: /^rawQuery$/, receiver: /^orm$/ },
            argument: 0, requires: 'sql', severity: 'high', cwe: 'CWE-89' },
        ],

        // Remove a built-in entry entirely. Use this if a parameter in your
        // codebase is legitimately named `req` and is not an HTTP request.
        disable: ['express.request.query'],
      },
    },
  },
}
```

The registry fails loudly at load rather than quietly at runtime, because never
matching looks exactly like being secure. It throws on: a misspelled `requires`
kind, a severity no report decision recognises, a wildcard sanitizer with no written
justification, and a sanitizer matched by bare method name.

**Registering a sanitizer is a security decision, not configuration.** A
wrongly-registered sanitizer is strictly worse than a missing one: a missing escaper
costs you a false positive, while a wrongly-trusted one converts an honest "I don't
know" into an assertion of safety and the finding disappears with no diagnostic at
all. This is why:

- `clears: ['*']` requires a note explaining why it is sound, and the test suite caps
  how many such entries may exist.
- A sanitizer matched by method name **must** carry a `receiver` pattern. `escape` is
  the cautionary example: lodash, `he` and `validator` all export an *HTML* escaper by
  that name, and trusting one of those as a SQL escaper silently disables the rule.

## Framework coverage

| Library | Sink | Safe parameter channel |
| --- | --- | --- |
| `pg` | `client.query(text, values)` | argument 1 |
| `mysql` / `mysql2` | `.query()`, `.execute()` | argument 1, `?` placeholders |
| Sequelize | `sequelize.query(sql, options)` | `bind` (server-side) or `replacements` |
| TypeORM | `.query(sql, parameters)` | argument 1 |
| Knex | `.raw()`, `.whereRaw()`, `.joinRaw()`, `.havingRaw()`, `.orderByRaw()`, `.groupByRaw()` | bindings argument |
| Prisma | `$queryRawUnsafe()`, `$executeRawUnsafe()` | argument 1+, or the tagged `$queryRaw` form |
| better-sqlite3 / sqlite3 | `.prepare()`, `.exec()`, `.all()`, `.get()`, `.run()`, `.each()` | `.prepare('… ?').run(values)`; `exec()` has none |

Sinks are matched by method name **and receiver**. A receiver that does not look like
a database handle is not a SQL sink — `child_process.exec` shares a name with
`db.exec`, and reporting the wrong vulnerability class is worse than reporting
nothing. Extend the receiver list through `registry` if your handles are named
unusually.

Sources:

- **HTTP request** — a parameter named `req` or `request`, accessed via `query`,
  `body`, `params`, `headers`, `cookies`, `signedCookies`, `url`, `originalUrl`,
  `path`, `hostname`, `host`, `ip`, `rawBody`, `files` or `file`. No constraint on the
  handler signature, so Express error middleware — `(err, req, res, next)` — is
  covered.
- **Browser** — `location` (also via `window`, `document`, `self`, `globalThis`),
  `document.URL`, `document.documentURI`, `document.referrer`, `document.cookie`,
  `window.name`.
- **Node** — `process.argv`, at low confidence.

## Limitations

**This rule detects statically identifiable flows from configured untrusted sources
to configured SQL sinks. It cannot prove the absence of SQL injection in arbitrary
dynamic code.**

Not detected:

1. **Cross-file flows.** Source and sink must be in the same file.
2. **Object, array and container properties.** `params.id = req.query.id;
   db.query('… ' + params.id)` breaks the chain — there is no heap model.
3. **Unknown function calls.** `db.query(build(req.query.id))` is not reported: an
   unknown callee might be a sanitizer, and propagating through unknown functions is
   the largest source of false positives in tools that do it. Local calls resolve
   only with `callDepth` raised.
4. **Destructured handler parameters.** `function handler({ query }, res)` has no
   parameter name for the heuristic to match.
5. **Loops and recursion.** Accumulation across iterations is missed.
6. **Class instance state.** `this.query = tainted` is not tracked, and `this.query(…)`
   is not recognised as a sink (only `this.db.query(…)`).
7. **Tags other than the known parameterizing ones.** `String.raw` is plain string
   building, but an unrecognised tag is treated as an unknown call and walls.
8. **Chains longer than `maxHops`** (default 12) are dropped regardless of how exact
   each hop was.
9. **Destructured handler parameters.** `function handler({ query }, res)` has no
   parameter name to match.
10. **Sinks reached indirectly.** `const { query } = pool; query(sql)` and
    `db.query.bind(db)` are not recognised — a sink must be a direct method call.

Known false positives:

11. **Reassignment does not clear taint.** `let x = req.query.id; x = 'safe'` is still
    reported, at reduced confidence.
12. **Guard clauses are not understood.** `if (!isValid(x)) return` does not clear
    taint unless `isValid` is a registered sanitizer, and an allowlist check
    (`ALLOWED.includes(v) ? v : 'default'`) is not recognised as a proof of safety
    even though it is one.
13. **A parameter named `req` or `request` that is not an HTTP request** and is
    accessed through one of the qualifying properties. Much narrower than matching the
    whole object, but still possible — an axios request config has `params`, `headers`
    and `url`. Remove the source with `registry.disable` if this affects you.
14. **Propagator and sink methods are matched by name.** A user-defined `join` is
    assumed to be `Array.prototype.join`, and a non-database object named `db` or
    `client` with a `.query()` method is treated as a database.

## How these limitations were found

The lists above are not a design-time guess. The rule was attacked from both
directions before release: an adversarial pass tried ~150 shapes to evade detection
and found 85 misses, and a false-positive pass wrote 96 pieces of safe, idiomatic
code and found 33 spurious reports. Both corpora ship as tests
(`adversarial.test.js`, `false-positive.test.js`), including the cases that are still
missed — a `valid` case in the adversarial corpus is a recorded false negative, not a
claim that the code is safe.

An independent review then rejected the first implementation over five findings, the
most serious being that `escape` was trusted by name. See
`docs/research/security-review-no-sql-injection.md`.

## No autofix

There is no fix and no suggestion, deliberately. Rewriting an interpolated query into
a parameterized one changes the argument list, the placeholder dialect (`$1` / `?` /
`:name`) and sometimes the method being called. It is not a mechanical
transformation, and a wrong "fix" applied to a security finding is worse than no fix.

## References

- [OWASP Top 10 A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command](https://cwe.mitre.org/data/definitions/89.html)
- [Prisma: raw database access](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- [Knex: raw](https://knexjs.org/guide/raw.html)
- [Sequelize: raw queries](https://sequelize.org/docs/v6/core-concepts/raw-queries/)
- [node-postgres: parameterized queries](https://node-postgres.com/features/queries)
