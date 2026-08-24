# no-sql-injection

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
- An **Express request** source is matched by parameter name and handler arity. That
  is a heuristic, so it is capped at 0.75, and findings rooted in it land in the
  0.5–0.7 band — medium.

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
          { id: 'my.orm.rawQuery', root: { method: /^rawQuery$/ }, argument: 0,
            requires: 'sql', severity: 'high', cwe: 'CWE-89' },
        ],
      },
    },
  },
}
```

A sink with a misspelled `requires` throws at startup rather than silently never
matching — never matching looks exactly like being secure.

**Registering a sanitizer is a security decision.** An entry with `clears: ['*']`
disables detection for every sink kind, so the registry requires a written
justification for any wildcard and the test suite caps how many may exist.

## Framework coverage

| Library | Sink | Safe parameter channel |
| --- | --- | --- |
| `pg` | `client.query(text, values)` | argument 1 |
| `mysql` / `mysql2` | `.query()`, `.execute()` | argument 1, `?` placeholders |
| Sequelize | `sequelize.query(sql, options)` | `bind` (server-side) or `replacements` |
| TypeORM | `.query(sql, parameters)` | argument 1 |
| Knex | `.raw()`, `.whereRaw()`, `.joinRaw()`, `.havingRaw()`, `.orderByRaw()`, `.groupByRaw()` | bindings argument |
| Prisma | `$queryRawUnsafe()`, `$executeRawUnsafe()` | use the tagged `$queryRaw` form |
| better-sqlite3 / sqlite3 | `.prepare()`, `.exec()` | `.prepare('… ?').run(values)`; `exec()` has none |

Sources: Express-style `req`/`request` handler parameters, `location`,
`document.URL`, `document.referrer`, `document.cookie`, `window.name`,
`process.argv`.

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
6. **Class instance state.** `this.query = tainted` is not tracked.

Known false positives:

7. **Reassignment does not clear taint.** `let x = req.query.id; x = 'safe'` is still
   reported, at reduced confidence.
8. **Guard clauses are not understood.** `if (!isValid(x)) return` does not clear
   taint unless `isValid` is a registered sanitizer.
9. **A parameter named `req` that is not a request object** is a false positive. This
   is why the source is capped at 0.75 and is configurable away.
10. **Propagator methods are matched by name.** A user-defined `join` is assumed to
    be `Array.prototype.join`.

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
