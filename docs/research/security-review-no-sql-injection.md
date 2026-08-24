# Security review — `no-sql-injection` (first security rule)

Reviewer: independent security reviewer (`.claude/agents/security-reviewer.md`).
Date: 2026-08-24. Commits reviewed: `e44b251`, `fc7d72d` (on `main`).
Test suite state at review: `pnpm test` — 225 pass, 0 fail.

---

## Verdict: **REJECT**

Two defects silently disable detection, one mismodels a documented API in the unsafe
direction, one documented mitigation does not exist, and the test that is supposed to
enforce `AGENTS.md`'s sanitizer rule certifies the violation as compliance.

`AGENTS.md` and the reviewer checklist make item R1 an **automatic rejection** on its own
terms: *"A function is never a sanitizer because it is named `sanitize`, `clean`, `escape`,
or `validate`."* `machinery/security/registry.js:160` registers a sanitizer whose entire
match condition is the name `escape`.

This is a genuinely good piece of engineering — the layering is right, the tagged-template
distinction is right, the parameter-channel-falls-out-of-argument-0 design is elegant, and
the `exec` receiver fix in `fc7d72d` shows the right instinct. None of that is in question.
The rejection is on five specific, reproducible defects. Every one of them is a small diff.

Everything below was verified by executing the analysis, not by reading it. Reproductions
are given as runnable code.

---

## Blocking findings

### R1 — `mysql.escape` is a name-matched sanitizer, and any `x.escape()` silently disables the rule
**`machinery/security/registry.js:159-166`**, matcher at **`machinery/security/taint.js:438-444`**

```js
{ id: 'mysql.escape', root: { method: /^escape$/ }, argument: 0, clears: ['sql'], confidence: 0.9 }
```

There is no receiver constraint. `sanitizerFor` matches a `MemberExpression` callee purely
on `getPropertyName`, so **every** `<anything>.escape(x)` in every file is trusted to
neutralise SQL. Sanitizers are checked first in `resolveCall` (`taint.js:398`), ahead of the
propagator table and ahead of the unknown-call wall, so the match is not merely optimistic —
it converts what would otherwise be a *wall* (no report, honest) into an *assertion of
safety* (no report, and the taint is marked clean for every downstream sink).

Verified, both report **zero** errors:

```js
// 1. lodash's escape is an HTML escaper. It does not escape a single SQL metacharacter.
const n = _.escape(req.query.n); db.query('SELECT * FROM u WHERE n = ' + n)

// 2. A user-defined identity function named `escape`.
const evil = { escape: x => x }; const n = evil.escape(req.query.n); db.query('WHERE n = ' + n)
```

Case 1 is not a contrived exploit. `_.escape`, `validator.escape` and `he.escape` are all
HTML escapers, all extremely common in Node dependency trees, and
`docs/research/framework-coverage.md:1581,1607` catalogues both of the latter as `html`-only
sanitizers. `framework-coverage.md:1465` names this exact failure and calls it *"the most
expensive kind of miss, because a reviewer sees `escape(x)` and stops thinking."* The
implementation institutionalises it.

The `confidence: 0.9` on the entry does not price this. Confidence lowers the score of a
*reported* finding; a sanitizer match produces **no finding at all** (`index.js:49` returns
early on `sanitizedFor.has('sql')`), so the 0.9 is inert. The note at `registry.js:165`
("Confidence below 1 because the method name is matched without a resolved receiver") is
therefore describing a mitigation that does not run.

**Recommended change.** Add a receiver constraint in the same shape as `sql.sqlite.exec`
already uses, e.g. `receiver: /^(mysql2?|conn|connection|pool|db|sql|client)$/i`, and route
the confidence through the *finding* rather than dropping it: an unresolved-receiver
sanitizer match should reduce confidence on a report, not suppress the report. If a lower
noise floor is wanted for a first release, delete the entry entirely — a missing sanitizer
costs a false positive, a wrong sanitizer costs a breach.

---

### R2 — `severity: 'critical'` is silently unreportable, and `critical` is this rule's own documented tier
**`machinery/security/finding.js:14-18`**, unchecked by **`registry.js:249-262`**

```js
const REPORTABLE = { high: {...}, medium: {...}, low: {...} }   // no `critical` key
```

`report()` does `REPORTABLE[severity]?.[bucket]` (`finding.js:41`). For
`severity: 'critical'` that is `undefined` → falsy → **dropped, with no error and no
diagnostic**. Verified: a consumer sink identical in every way except `severity`:

```
consumer sink with severity 'critical': 0 reports
consumer sink with severity 'high':     1 report
```

This is not a hypothetical vocabulary. `docs/research/taxonomy.md:474` — the severity
authority for this project — defines the `critical` tier as *"Remote code execution or full
data-store compromise — CWE-78, CWE-95, CWE-502, **CWE-89 with a proven taint path**"*. A
proven CWE-89 taint path is precisely what this rule reports. So:

1. The built-in SQL sinks are graded `severity: 'high'` (`registry.js:78` and three more),
   which **deviates from the project's own anchor table** without a recorded justification.
2. A consumer who reads `taxonomy.md`, follows it correctly, and registers a custom raw-SQL
   sink as `critical` gets **zero findings forever**. `registry.js:248` states the governing
   principle for this file — *"never matching looks exactly like being secure"* — and
   `validate()` enforces it for `requires` and for `clears`, but never looks at `severity`.

**Recommended change.** Two lines. Add a `critical` row to `REPORTABLE` (mirroring `high`),
and add `severity` to the closed-vocabulary check in `validate()` so a typo or an unhandled
tier throws at load. Then re-grade the four SQL sinks to `critical` per `taxonomy.md:474`, or
record in `registry.js` why `high` was chosen instead.

---

### R3 — `mysql.escapeId` is mismodelled: it clears `sql`, and the project's research says it must not
**`machinery/security/registry.js:167-174`**, kind vocabulary at **`registry.js:21-35`**

`docs/research/framework-coverage.md:38-40` defines **two** SQL kinds:

| kind | sink class |
|---|---|
| `sql` | SQL **value** position |
| `sql-identifier` | SQL **identifier / keyword / ORDER BY** position — parameterization cannot cover this |

`registry.js` KINDS collapses these into one `sql`. Consequences, both verified as **zero
reports**:

```js
// escapeId in a VALUE position. Renders  WHERE name = `admin`  — a backtick-quoted
// IDENTIFIER, which MySQL reads as a column reference, not a string literal.
const n = mysql.escapeId(req.query.n); db.query('SELECT * FROM u WHERE name = ' + n)

// escape() in an IDENTIFIER position. Renders  ORDER BY 'col'  — a constant, silently
// ignored as an ordering.
const c = mysql.escape(req.query.col); db.query('SELECT * FROM u ORDER BY ' + c)
```

`framework-coverage.md:1896` is explicit that `escapeId` / `escapeIdentifier` /
`sql.identifier` / `knex.ref` neutralise **`sql-identifier` only** and answer `NO` for `sql`.
`framework-coverage.md:583` and `:604` confirm the backtick semantics from source. The
registry asserts the opposite of its own verified research.

The same collapse also produces **wrong remediation advice**. `rules/no-sql-injection/index.js:16,22`
unconditionally tells the developer *"Use the parameter channel instead of building the SQL
string."* `framework-coverage.md:485-490` addresses this directly: *"Parameter binding cannot
cover an identifier position — a rule that suggests 'use parameters' for a dynamic `ORDER BY`
column is giving wrong advice; the correct advice is an allowlist or the identifier-quoting
helper."* Verified message on an `ORDER BY` flow:

> `… Use the parameter channel instead of building the SQL string.`

Wrong advice on a security finding is a real cost: it sends the developer to
`ORDER BY $1`, which fails at runtime in Postgres (`framework-coverage.md:513`: *"PostgreSQL
has NO identifier placeholders"*) and teaches them the rule is broken.

**Recommended change.** Add `'sql-identifier': 'CWE-89'` to `KINDS`; change `mysql.escapeId`
to `clears: ['sql-identifier']` and `mysql.escape` to `clears: ['sql']` (unchanged) with an
explicit `not: ['sql-identifier']` note. Since phase 1 cannot tell a value position from an
identifier position, the honest interim is: keep the sink as `requires: 'sql'`, accept
`escapeId` as *not* clearing it (a false positive on legitimate identifier quoting — cheap,
visible, and the developer can see why), and drop the "use the parameter channel" sentence in
favour of naming both channels. Do not ship the current direction, which trades a visible
false positive for a silent false negative.

---

### R4 — "configurable away" does not exist; the rule's principal false positive has no off switch
**`machinery/security/registry.js:45`** and **`rules/no-sql-injection/readme.md:198-199`**

Both say the Express source *"is configurable away"*. `merge()` (`registry.js:233-243`)
only **prepends** consumer entries to the built-in arrays. Every lookup uses `Array.find`,
so a built-in that matches still matches. There is no `disable`, no `exclude`, no
`replace`, no id-based override. Verified — all three attempts still report:

```
override express.request with a never-matching regex: 1 report
registry: { sources: [] }:                            1 report
minConfidence: 0.8:                                   0 reports   ← the only real escape hatch
```

So the documented mitigation for the acknowledged false positive (readme limitation #9,
`registry.js:45`) is fiction. The only actual lever is `settings['@kaliber/security']
.minConfidence`, which is **global to the whole security subsystem** — raising it to silence
one noisy `req` parameter also silences every medium-confidence finding of all forty-nine
future rules. That is a lever nobody will pull twice.

**Recommended change.** Either implement suppression (`registry: { disable: ['express.request'] }`
filtered inside `merge`, ~3 lines), or delete the claim from both places and say plainly:
"there is no per-source opt-out in this release; use an ESLint disable comment." The second
is acceptable for a first release. The current text is not.

---

### R5 — the test that enforces the sanitizer rule is inverted, and passes *because* of the violation
**`machinery/security/registry.test.js:35-43`**

```js
test('no sanitizer is trusted because of its name alone', () => {
  for (const sanitizer of registry.sanitizers)
    assert.ok(sanitizer.root.global || sanitizer.root.method || sanitizer.root.module, …)
})
```

`root.method` **is** a regex on a method name. The assertion is satisfied by the presence of
name matching, and the test then reports that as evidence that name matching is not
happening. `mysql.escape` — the R1 defect — passes this test. It is the only tautology in the
corpus and it is guarding the one rule `AGENTS.md` marks as an automatic rejection.

**Recommended change.** Assert the property that actually matters: a sanitizer matched by
`root.method` must additionally carry `root.receiver` or `root.module`, i.e. something that is
not a name. That single change fails today, on `mysql.escape` and `mysql.escapeId`, which is
exactly what a working guard should do.

---

## Non-blocking findings, ranked

### N1 — `pickWorse` is kind-blind, so an unrelated sanitizer masks a real injection, order-dependently
**`machinery/security/taint.js:514-524`**

`cleanliness` is `sanitizedFor.size`, so a value cleared for `url` ties with a value cleared
for `sql`. The tie is broken by confidence (`taint.js:523`). Verified — two semantically
identical queries, differing only in operand order:

```js
const a = encodeURIComponent(req.query.a)   // url-clean, still SQL-injectable
const b = mysql.escape(req.query.b)         // sql-clean

db.query('WHERE a=' + a + ' AND b=' + b)    // → 0 reports  (picks b, sanitizedFor = {sql})
db.query('WHERE b=' + b + ' AND a=' + a)    // → 1 report   (picks a, sanitizedFor = {url})
```

The first line contains a genuine injection via `a`, and the analysis reports nothing because
an *unrelated* correctly-escaped operand happened to have the higher confidence. The comment
at `taint.js:521-522` — *"keep the one we are most confident about, so the report we make is
the strongest one available"* — is wrong about its own effect: the tiebreak can select the
branch that causes **no report at all**. The docstring at `taint.js:510-512` ("only as safe as
its least sanitised part") states the correct intent; the code does not implement it.

**Fix.** Make `pickWorse` sink-aware, or make cleanliness a subset comparison instead of a
size comparison, so `{url}` and `{sql}` are *incomparable* and both are retained (a
`Set`-valued intersection across operands is the natural model: a concatenation is clean for
kind *k* only if every tainted operand is clean for *k*). This is the strongest technical
finding in the review and the one most likely to survive into the next forty-nine rules.

### N2 — the readme's severity/confidence table claims per-finding ESLint levels that cannot exist
**`rules/no-sql-injection/readme.md:112-114`**

```
| **severity high** | reported (`error`) | reported (`warn`) | dropped |
```

An ESLint rule has exactly one severity, from the consumer's config. `report()`
(`finding.js:43`) calls `context.report` identically for high and medium confidence; the only
difference is the `messageId`. A high-confidence and a medium-confidence finding from this
rule emit at the *same* level, always. The table promises assurance the mechanism cannot
deliver, and it is the first thing a reviewer of rule #2 will copy.

`taxonomy.md:490-498` and `AGENTS.md:61-62` are about the **default level assigned to a rule
in a shipped config** — a per-rule decision — not a per-finding one. Since this rule's most
common source (Express, capped 0.75) yields *medium*, the matrix says its default level is
`warn`, not `error`.

**Fix.** Relabel the columns "reported" / "reported" / "dropped", and state the rule-level
consequence in one sentence: findings vary between medium and high confidence, so the rule's
default level is `warn`.

### N3 — `minConfidence` only works upward; the `low` column of `REPORTABLE` is unreachable
**`machinery/security/finding.js:38-41`, `:58-62`**

`confidenceBucket` returns `'low'` below 0.5, and `DEFAULTS.minConfidence` is 0.5 — the same
boundary. At defaults the two gates are exactly redundant: the `low: false` column can never
fire, because nothing below 0.5 reaches it. Off defaults they contradict. Verified:

```
minConfidence 0.8: 0 reports   (tightening works)
minConfidence 0.1: 1 report    (no change — no additional findings surface)
a sub-0.5 flow at minConfidence 0.1: 0 reports  (dropped by REPORTABLE, not by the floor)
```

So `minConfidence` is a one-way valve. `taxonomy.md:496` says severity `high` + confidence
`low` is *"**off** (opt-in)"* — opting in is impossible. And `readme.md:116` ("Findings below
`minConfidence` are computed but not reported") describes only the half that works.

**Fix.** Pick one mechanism. Either delete the `low` column from `REPORTABLE` and let
`minConfidence` own the floor entirely (simplest, and makes the option honest in both
directions), or keep the table and document `minConfidence` as tightening-only. The table
earns its place for the *severity* axis; the confidence axis is already a number.

### N4 — `explainConfidence` systematically blames the wrong hop
**`machinery/security/finding.js:85-93`**

It filters `hop.penalty > 0`. The source hop is constructed with `penalty: 0`
(`taint.js:195`), so the **dominant** reason a finding is medium — the 0.25 the Express
parameter-name heuristic costs off the top — is structurally excluded. Verified message:

> `Confidence is medium because the value passes through string concatenation, property access.`

Concatenation and property access account for 0.09 of the 0.34 shortfall. The heuristic
source accounts for 0.25. The docstring says *"Why a finding is not high confidence"*; the
function answers a different question, and the answer it gives points the developer at
syntax they cannot change instead of at the assumption they should check (*is this `req`
actually a request?*). `REASON` even has the right string ready at `finding.js:104`.

**Fix.** Treat `source.confidence < 1` as a penalty-bearing reason and surface `param`.

### N5 — the additive-penalty rationale is contradicted by `maxHops`
**`machinery/security/taint.js:6-16` vs `:462-473`**

The comment: *"a twenty-hop chain of `const` aliases stays at full confidence, which is
correct, because we are certain about every step."* It does not. `hop()` returns `null` once
`path.length >= options.maxHops` (12). Verified — a 13-alias chain of exact, zero-penalty
reads:

```
const a0 = req.query.id; const a1 = a0; … const a13 = a12
db.query('WHERE id = ' + a13)     // → 0 reports, taint = null
```

A twenty-hop alias chain is not "full confidence", it is **silently discarded**. The failure
is invisible: `bail('maxHops')` increments a stat nothing reads, and `taintOf` returns `null`,
which `taint.js:77` documents as *"untainted **or** unknown, deliberately indistinguishable"*.
The stated benefit of additive penalties is real for chains under 12; the comment
over-generalises it into a guarantee the code revokes at 12. `maxHops` is also absent from
the readme's Limitations.

**Fix.** Correct the comment to say what the code does, and add `maxHops` to Limitations. The
budget itself is defensible; the claim about it is not.

### N6 — `previousWriteTaint`'s unsoundness is toward a **false positive**, not the claimed false negative
**`machinery/security/taint.js:331-344`**

The `ponytail:` comment says *"Fails toward a missed finding rather than a false one."* The
first half is true (loop-carried taint is missed). The second is not: the function collects
**all** textually-earlier writes and takes `reduce(pickWorse)`, not the *nearest* one.
Verified — reports 1 error on code whose value at the sink is the constant `'safe LIMIT 1'`:

```js
let q = req.query.id; q = 'safe'; q += ' LIMIT 1'; db.query(q)      // → 1 report (FP)
```

Realistic shape, not just a puzzle: `let where = req.query.f; if (!allowed(where)) where = '1=1'; where += ' AND active'`.
The `multiWrite` penalty applies (0.56 observed) so it does not reach high confidence, and
readme limitation #7 covers the general "reassignment does not clear taint" case — so the
*behaviour* is within the documented envelope. The **code comment is wrong**, which matters
because it is the justification a future maintainer will trust.

**Fix.** Take the nearest earlier write (`max` by `range[0]`) rather than the worst of all of
them — one line, strictly more precise, still no CFG — and correct the comment to say the
approximation cuts both ways.

### N7 — the `exec` receiver argument was not applied to `execute`, `prepare` or `query`
**`machinery/security/registry.js:73-82`, `:113-122`** vs **`:103-112`**

`fc7d72d` added a receiver constraint to `sql.sqlite.exec` on the stated principle that
*"reporting 'SQL injection' on a command injection is worse than missing it"*
(`registry.js:111`). The identical argument applies to `execute`, `prepare` and `query`,
which have no receiver constraint at all. Verified — both report `sqlInjectionQualified`,
i.e. CWE-89, on calls that are not SQL:

```js
temporal.workflow.execute('wf-' + req.query.n)     // → 1 report, "SQL injection"
mailer.prepare('subject ' + req.query.n)           // → 1 report, "SQL injection"
```

`.execute()` and `.prepare()` are generic fluent-API verbs (workflow clients, command
objects, mail/template builders). The `MemberExpression`-required guard at `taint.js:207` and
the object-literal wall filter a lot of noise, but not this. The rule reports the wrong
weakness class with a confident CWE attached — the exact harm `fc7d72d` was written to
prevent.

**Fix.** Split `sql.query` into a receiver-constrained entry (the `db|conn|connection|pool|client|
sequelize|knex|prisma|manager|queryRunner` family, mirroring `sql.sqlite.exec`) plus, if
wanted, an unconstrained lower-confidence variant. Same for `prepare`.

### N8 — the Express heuristic gates on arity, which `competitive-analysis.md` forbids by name
**`machinery/security/registry.js:41`**, matcher at **`taint.js:175-188`**

```js
root: { param: { name: /^(req|request)$/, index: 0, arity: [2, 3] } }
```

`docs/research/competitive-analysis.md:465` — *"the enclosing construct plus a regex on the
HTTP method name — not on arity alone"* — and `:1314` — *"never on arity or parameter position
alone."* The implementation gates on name **and** index **and** arity, and on nothing else:
no enclosing `app.get(...)` / `router.use(...)` / `requestHandlers` context, which is what
the research actually prescribes. Measured consequences:

| shape | result | |
|---|---|---|
| `(req, res)` | reports | ✓ |
| `(req, res, next)` | reports | ✓ |
| `(err, req, res, next)` — Express **error handler** | **0 reports** | FN; `req` is at index 1, arity 4 |
| `(request)` — Next.js App Router `POST(request)` | **0 reports** | FN; arity 1 |
| `(ctx, next)` — Koa | 0 reports | FN; the note at `registry.js:45` claims Koa coverage |
| `function f(req, res) { db.query('SET ' + req.key) }` | reports | FP; `path: []` taints *every* property of any 2–3-arity `req` |

Is 0.75 the right ceiling? For the *name* heuristic in isolation, it is defensible. But 0.75
minus two member hops is 0.71 — comfortably above the 0.5 floor — so the cap does not
actually gate anything, and per R4 there is no per-source opt-out. The cap is presented as
the mitigation (`registry.js:45`, readme #9) and functions as neither a gate nor an escape
hatch.

**Is this shippable?** Yes, *with* R4 fixed and the arity range widened to cover the error
handler and the 1-arity modern shapes (drop the upper bound; allow `index` to be a set). Not
shippable as the sole basis of a source while the note claims coverage it does not have.

### N9 — `resolveLogical`'s `&&` justification is stated as a general fact and is false for a kind already in `KINDS`
**`machinery/security/taint.js:379-384`**

*"a falsy value reaching a string sink is not exploitable"*. For **SQL string** sinks the
conclusion holds: `0`, `''`, `NaN`, `null` cannot introduce a quote or a statement
separator. `` `WHERE id = ${''}` `` is a syntax error, not an injection, and `0` / `NaN` are
inert. So the behaviour is right for this rule, and `PENALTY.logical` is correctly still
charged on the surviving branch.

The problem is that this is the **shared** layer and the comment is written as a universal.
`KINDS` already contains `nosql` (`registry.js:30`), where a falsy left operand is a textbook
exploit rather than a non-event:

```js
db.users.findOne({ user, password: pw && hash(pw) })   // pw falsy → password: undefined
```

Mongo drops `undefined` keys, and the filter degrades to `{ user }` — authentication bypass.
The moment a `no-nosql-injection` rule lands on this layer, `resolveLogical` will be silently
wrong and this comment will be the reason nobody notices.

**Fix.** Narrow the comment to "not *injectable* into a string sink", and add a `TODO`/note
that the `&&` short-circuit must become kind-aware before a `nosql` sink is registered. No
code change needed today.

### N10 — `String()` is a wall, and it is the most common string coercion in the language
**`machinery/security/registry.js:191-210`**

`.toString()` is a propagator; `String(x)` is not, and is not a sanitizer either, so
`resolveCall` falls through to the unknown-call wall. Verified: `0 reports` on

```js
const id = String(req.query.id); db.query('WHERE id = ' + id)
```

Taint-preserving coercion modelled as taint-destroying. One-line registry addition
(`{ method: 'String', global: true, args: [0] }`-shaped, or a `globalPropagators` list beside
`propagators`). Also missing and cheap: `Array.prototype.map`/`filter` results, `JSON.parse`
(preserves taint through the structure), `util.format`/`sprintf` — the last is explicitly
called out at `framework-coverage.md:483` as needing interpolation treatment.

### N11 — tagged templates are treated as unconditionally safe; the research documents two exceptions
**`machinery/security/taint.js:386-395`**

*"every tag we care about parameterizes its interpolations."* `framework-coverage.md` records
two verified counterexamples:

- `:831` — TypeORM v7: `` sql`SELECT * FROM ${() => "dyn_table"}` `` — a **function**
  interpolation renders raw and unescaped.
- `:939-952` — drizzle `inlineParams`: `` sql`…`.inlineParams() `` converts binding into
  client-side escaping. *"an easy-to-miss modifier on an otherwise-safe `sql`` ` template."*

The blanket `return null` is the right default and the right shape for phase 1 — the
alternative (flagging `$queryRaw`) is the canonical Prisma false positive
(`framework-coverage.md:857`) and correctly avoided. But the comment asserts a property the
project has already disproven, and neither exception appears in the readme's Limitations.

**Fix.** Soften the comment; add both to Limitations. Registry entries for `sql.raw` /
`Prisma.raw` / `inlineParams` can wait — note that `sql.knex.raw`'s `/^raw$/` already covers
`sql.raw(x)` and `Prisma.raw(x)` by accident, which is worth making deliberate.

### N12 — `path: 'CWE-22'` and source-level `CWE-20` contradict `taxonomy.md`
**`machinery/security/registry.js:26`, `:45,49-65`**

Not load-bearing for this rule — no `path` sink exists yet and `source.cwe` is never read —
but this file is the template for forty-nine more rules, so it should not ship wrong.

- `path: 'CWE-22'`. `taxonomy.md:50` — *"CWE-23 or CWE-36 (**not** CWE-22)"*; `:290` marks
  CWE-22 `Allowed-with-Review`; `:381` records MITRE's own redirection to 23/36.
- Every source carries `cwe: ['CWE-20']`. `taxonomy.md:326` marks CWE-20 **Discouraged**, and
  `§7.2` (`:602-607`) is a rejection of exactly this pattern: *"Every taint finding → CWE-20
  … **Verdict: reject.** … CWE-20 may appear in a parent chain, never as the primary."* Dead
  metadata today; a landmine when someone surfaces it.
- `url: 'CWE-601'` collapses `framework-coverage.md:47`'s `CWE-918 / CWE-601` (SSRF and open
  redirect are different weaknesses with different severities).

**Fix.** `path: 'CWE-23'`; drop `cwe` from source entries or rename the field to something
that cannot be mistaken for a finding CWE; split `url` from `ssrf`.

### N13 — `analyze()` silently ignores `options` on a cache hit
**`machinery/security/taint.js:51-61`**

Verified: `a1 === a2` when two rules call `analyze` with different `maxHops` and different
registries for the same `SourceCode`. The first caller in a file freezes the configuration
for every subsequent rule. Benign today (ESLint `settings` are per-file, so all rules receive
identical options, and only one security rule exists), and the structural-invalidation
docstring at `:44-50` is correct as far as it goes — but it does not mention that options are
part of the cache key in intent and not in fact. One-line guard or one-line comment.

---

## Checklist items that pass

- **Autofix (item 10).** Confirmed: `meta.fixable` and `meta.hasSuggestions` are both
  `undefined`, no `fix` or `suggest` anywhere. The reasoning at `index.js:25-29` and
  `readme.md:203-208` is correct and correctly argued — the placeholder dialect varies by
  driver, the argument list changes, and sometimes the method changes. **This is exactly
  right and should be the template for the remaining rules.** Note the comment sits above
  `schema: []` rather than above an absent key, which reads slightly oddly but is harmless.
- **CWE / OWASP / CAPEC.** `CWE-89` is the correct Base (`taxonomy.md:279`, `Allowed`,
  parent `CWE-943`). `A03:2021` with the mandatory edition suffix is correct, and the
  readme's note that 2025 renumbers Injection to A05 is verified at `taxonomy.md:218,221`.
  `CAPEC-66` is the correct primary (`taxonomy.md:417`). All four references resolve to real
  identifiers; no invented citations found anywhere in the slice.
- **The parameter-channel design.** `db.query(text, values)` staying clean because the taint
  is in argument 1 and argument 1 is not the sink is the single best decision in the
  implementation. It generalises across pg, mysql2, knex, Sequelize, TypeORM and
  `$queryRawUnsafe(sql, ...values)` with no per-library code, and it matches
  `framework-coverage.md:473-478` exactly.
- **The tagged-template distinction.** `$queryRaw` vs `$queryRawUnsafe` handled correctly and
  pinned by `registry.test.js:53-64`, which is the most valuable test in the corpus. This is
  the canonical false positive in this problem space and it is avoided.
- **mysql2 `query` vs `execute`.** The note at `registry.js:81` matches
  `framework-coverage.md:594-597` accurately, including that `??` identifier placeholders do
  not expand on the prepared path. Minor: `framework-coverage.md:1941` flags that conclusion
  as source-derived and not doc-backed, and the registry note states it flatly; worth the
  half-sentence caveat.
- **`sinkAt` requiring a `MemberExpression` callee** (`taint.js:207`) and the
  `getStaticValue` fast rejection (`taint.js:98`) are both good, cheap precision wins, and
  the `isGlobalNamed` treatment of declared-vs-undeclared globals (`taint.js:141-148`) is a
  subtle bug correctly anticipated — the reasoning in that comment is the best in the file.
- **`nonPropagatingProperties`** and the `+`-only `BinaryExpression` restriction are sound.

### Test quality (checklist item 7)

Positive, negative and adversarial corpora all exist; the name-collision block at
`rules/no-sql-injection/test.js:248-268` is genuinely adversarial and the `child_process`
cases are the right ones to pin.

On the exact-confidence assertions in `taint.test.js`: they are **not** tautologies, and the
header at `:10-19` is honest about what they are — change-detectors that force a human to
look at every affected case when a penalty moves. That is a legitimate and well-argued use of
a golden test. Their limit should be understood, though: because the expected value is
re-derived from the same table it is testing (`// 0.75 - member - member - template`), they
detect *drift*, never *wrongness* — a penalty that is the wrong number passes forever. The
comment claiming these numbers are "engineering judgement, not measurement" (`taint.js:14`)
is the honest framing, and there is no corpus measuring FP rate against real code. For rule
#1 that is acceptable; before rule #10 the project needs a real-world corpus, because
`AGENTS.md`'s metric — useful findings ÷ false-positive burden — is currently unmeasured.

The one tautology is R5, and it is in the worst possible place.

### Documentation honesty (checklist items 6, 9)

The readme is well above average: the lead sentence of Limitations
(`readme.md:174-176`) is exactly the disclaimer `AGENTS.md` requires and does not imply
proof of absence. Ten limitations, split honestly into false negatives and false positives.

It nonetheless overclaims in four specific places, all fixable in prose:

1. The `error` / `warn` matrix (**N2**) — promises a mechanism that does not exist.
2. "configurable away" (**R4**, `readme.md:199`) — the mitigation does not exist.
3. `readme.md:104-105`, *"provably cannot be an injectable string in any language"* — see
   the wildcard analysis below; true for the kinds in `KINDS`, but "provably … in any
   language" is a stronger claim than a name-based match on four globals can support, and
   `'*'` is unbounded over kinds not yet invented.
4. `readme.md:161` lists mysql/mysql2 `.execute()` with *"argument 1, `?` placeholders"* as
   the safe channel without the `??` caveat the registry itself records — the one place the
   readme is less accurate than the code.

Missing from Limitations: `maxHops` truncation (**N5**), `String()` and other unmodelled
coercions (**N10**), the tagged-template exceptions (**N11**), identifier-position blindness
(**R3**), and that the rule is **off by default** — which is nowhere stated.

### The `'*'` wildcard (interrogation item 3)

Asked directly: is `Number` / `parseInt` / `parseFloat` / `BigInt` clearing every kind sound?

**For injection, yes.** The reachable outputs are decimal digits, `-`, `.`, `e`, `+`,
`Infinity`, `NaN`, and `BigInt` either returns a BigInt or throws. None of those strings
contain a quote, a semicolon, a comment marker, a backtick, `<`, `/`, `..`, CR, LF, or a
regex metacharacter — so across all thirteen kinds currently in `KINDS` the values cannot
carry a payload. `parseFloat('1e400') === Infinity` renders `Infinity`, and `Number('')`
renders `0`; both are inert as *injections*.

**The string form does still matter, twice, and neither is injection:**
- `NaN` / `Infinity` interpolated into SQL is a syntax error in Postgres and MySQL —
  a reachable 500 from attacker input. Availability, not integrity. Out of scope for CWE-89,
  and correctly so.
- `Number('')` → `0` and `Number(' ')` → `0` silently substitute a valid row id. That is a
  logic flaw (CWE-1287-shaped), invisible to any taint model, and not this rule's job.

**Is there a sink kind where a numeric value is still dangerous?** Not among the thirteen
kinds in `registry.js:21-35` — `nosql` is the closest call, since NoSQL injection is about
operator *objects* rather than strings, but a coerced number is a scalar and cannot become
`{$ne: null}`. The soundness risk is not in today's list; it is that `'*'` is a claim about
**all future kinds**, asserted once and never revisited, and the `validate` guard at
`registry.js:260` only requires a *note*, not a bounded kind set. `registry.test.js:29` caps
the list at 6 while 4 exist — the cap is not currently constraining anything.

**Verdict on item 3: sound today, and the reasoning in the notes is correct.** Two cheap
hardenings: state the claim as "cannot carry an injectable payload for any kind in `KINDS`"
rather than "in any language", and tighten the test cap to `<= 4` so adding a fifth wildcard
is a deliberate act with a diff someone must approve.

### Should the rule be in the shipped `eslint.config.js`? (interrogation item 1)

**No — leaving it out is the right call, and it is the only reason this review is a REJECT
rather than an incident.** With R1 (any `.escape()` disables detection), R3 (identifier
positions silently safe), N1 (order-dependent masking) and N7 (wrong weakness class on
`.execute()`) live, turning this on for every consumer of `@kaliber/eslint-plugin` would
produce both false confidence and misattributed findings in real projects on day one.

Two things are missing from that decision, though:

1. It is **undocumented**. Neither the readme nor `AGENTS.md` says the rule is off by
   default, so a consumer who reads the readme will assume they are covered.
2. `index.js:38` has `configs: {}`. There is no `configs.security` and no `configs.recommended`,
   so there is no supported way to opt *in* to the security rules as a set — each consumer
   must know the rule name. With forty-nine more coming, the config surface should be decided
   now, before the first one ships, because `AGENTS.md:9-10` makes structure changes breaking.

Recommendation: keep it out of `eslint.config.js`; add `configs: { security: … }` shipping
this rule at `warn` (per N2's matrix reading); state "off by default, opt in via
`configs.security`" in the readme.

---

## What would change this verdict

**To APPROVE WITH CONDITIONS** — fix the five blocking findings:

1. **R1** — receiver-constrain `mysql.escape`, or delete the entry. *(the one that matters most)*
2. **R2** — add `critical` to `REPORTABLE`, validate `severity` as a closed vocabulary, and
   reconcile the SQL sinks with `taxonomy.md:474`.
3. **R3** — add the `sql-identifier` kind, or accept the false positive and stop asserting
   `escapeId` clears `sql`; drop the unconditional "use the parameter channel" advice.
4. **R4** — implement source suppression, or delete the "configurable away" claim from
   `registry.js:45` and `readme.md:199`.
5. **R5** — rewrite the name-matching test so it fails on a name-only sanitizer.

Each is a small diff. R1 and R5 are the same defect seen from two directions and should be
fixed in one commit. Every one of the five must come with a regression test that fails
before the change — for R1 the test is `_.escape(req.query.n)` reaching `db.query`.

**To APPROVE** — additionally fix **N1** (kind-aware `pickWorse`), **N2** and **N3** (the
matrix and `minConfidence` made coherent, one mechanism not two), **N7** (receiver-constrain
`execute` and `prepare`), and correct the three false code comments (**N5**, **N6**, **N11**)
plus the Limitations omissions. N4, N8–N13 are then reasonable follow-ups, but **N8's
Limitations entry must be honest before shipping** — the note at `registry.js:45` currently
claims Koa coverage the matcher does not have.

**The single most important thing to fix:** `registry.js:160`. A sanitizer matched by the
name `escape` on any receiver means one `_.escape()` — an HTML escaper, in a Node dependency
tree that almost certainly already contains lodash — turns SQL injection detection off with
no diagnostic. That is worse than not having the rule, because the readme tells the developer
they are covered. It is also the precise pattern `AGENTS.md:65` names as an automatic
rejection, and the test written to prevent it passes because of it.

---

## Reproduction

Every empirical claim in this document was produced by linting the snippet shown with
`rules/no-sql-injection` at `error` via `Linter#verify` (ESLint 10,
`ecmaVersion: 2022`, `sourceType: 'module'`), and by reading `taintOf` at the sink argument
through a probe rule. Confidence figures are `Math.round(c * 1000) / 1000`.
