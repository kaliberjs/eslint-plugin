# security-no-groq-injection

Detects untrusted input flowing into a raw GROQ query (Sanity's query language).

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-943: Improper Neutralization of Special Elements in Data Query Logic](https://cwe.mitre.org/data/definitions/943.html)
- **Severity:** high · **Confidence:** varies per finding, reported in the message

## What it detects

A flow from a registered untrusted **source** to `client.fetch(query)`, where the
value reaches the query as part of the query string rather than through GROQ's
`$parameter` channel:

```
req.query.slug  ->  slug  ->  `*[slug.current == "${slug}"]`  ->  client.fetch()
    source          alias           string building              sink
```

Sink (registry): `.fetch(query, params)` on a receiver named `client`,
`sanityClient`, `sanityReadOnlyClient`, `sanityWriteClient`, `readOnlyClient`,
`authorizedClient`, or `previewClient` — the closed set actually used across
every Sanity-backed project surveyed. Extend this via `registry` if your
handles are named unusually.

## The `groq` tag changes nothing about taint

The `groq` npm package's template tag is a verified no-op:

```js
export default function groq(strings, ...keys) {
  return strings.slice(0, -1).reduce((acc, str, i) => acc + str + keys[i], '') + strings.at(-1)
}
```

It concatenates its interpolations with no escaping — it exists purely so editors
can apply GROQ syntax highlighting. A `` groq`...` `` query is exactly as
injectable as the same interpolations in a plain template literal or string
concatenation, and it is the dominant way GROQ queries are actually written (this
rule's fixtures and the corpus behind it are drawn from real Kaliber codebases
where it outnumbers untagged template literals by roughly 200 to 1). The shared
taint analysis (`machinery/security/taint.js`) treats a `groq`-tagged template
identically to a plain one for exactly this reason — untagged and tagged forms
are both covered.

## Incorrect

```js
function handler(req, res) {
  const slug = req.query.slug
  client.fetch(groq`*[slug.current == "${slug}"]`)          // template interpolation
  client.fetch('*[slug.current == "' + slug + '"]')         // concatenation
}
```

## Correct

```js
function handler(req, res) {
  const slug = req.query.slug

  client.fetch(groq`*[slug.current == $slug]`, { slug })
  client.fetch('*[slug.current == $slug]', { slug })
}
```

No special case makes these clean: the taint is in argument 1, and argument 1 is
not the sink. A parameterized call simply leaves the query string untainted —
GROQ binds `$slug` server-side, the same way a SQL driver binds `$1` or `?`.

## Query-fragment composition is not data interpolation

Real GROQ queries are commonly composed from shared, locally-defined projection
fragments:

```js
const postFields = groq`{ title, slug, "author": author->name }`
readOnlyClient.fetch(groq`*[_type == "post"] { ${postFields} }`)
```

`postFields` is not a registered source — it is a local constant built from
static query text — so this stays quiet. The rule follows the same taint-based
distinction `no-sql-injection` uses for a static query built alongside a
tainted one: composing query structure from your own fragments is unrelated to
interpolating a request value into the query.

## Sanitization is typed

A sanitizer clears specific *kinds*. `encodeURIComponent` clears `url`, not the
`nosql` kind GROQ sinks require, so this is still reported — correctly:

```js
const slug = encodeURIComponent(req.query.slug)
client.fetch(`*[slug.current == "${slug}"]`)   // reported
```

## Configuration

The rule itself takes no options. The analysis is configured through shared
settings — see `no-sql-injection`'s readme for the full settings shape
(`minConfidence`, `registry.sinks`, `registry.disable`, etc.), which this rule
shares.

## Limitations

Stated honestly, inherited from the shared taint analysis (see
`no-sql-injection`'s readme for the full list this rule also carries):

- Cross-file flows, object/array/container properties, unknown function calls,
  destructured handler parameters, loops/recursion, and chains longer than
  `maxHops` are not detected.
- A receiver that does not match the configured name list (a renamed or
  differently-structured Sanity client) is a false negative.
- **Multiple documented `groq`-tagged interpolations of the same untrusted
  value across a fragment chain are each evaluated independently** — the
  analysis does not special-case fragment composition beyond ordinary taint
  propagation: a fragment that itself embeds a tainted interpolation is
  still detected wherever it is ultimately used as a sink argument.
- **A chained or wrapped client receiver is a false negative**:
  `client.withConfig({ token }).fetch(...)` (next-sanity's preview-mode
  switch), `getClient(preview).fetch(...)`, and `sanityClient.clone().fetch(...)`
  are all real, common Sanity API shapes the receiver matcher does not
  follow — it only resolves a bare identifier or a direct member access,
  never a call expression. Widening this is a registry-shaped decision
  (which methods are legitimately pass-through) rather than a one-line fix,
  since the same widening applied generically also turns
  `db.prepare(sql).get(x)` into a false SQL-injection report — see
  `registry.js`'s `sql.statement.run` note for why that specific shape is
  deliberately excluded.
- **`defineQuery()` (next-sanity's TypeGen wrapper, a verified identity
  function) is an unrecognised call and walls**, same as any other
  unrecognised function — in a typed Sanity codebase this wraps nearly
  every query.
- **A renamed `groq` import evades the tag check.** Recognition is by bare
  identifier name (`groq`), never traced to the package — `import { groq as
  g } from 'groq'`, a namespace import, or `const g = groq` all evade both
  the taint-propagation fix and the GROQ-syntax-hint check. Low likelihood
  in practice (nobody renames this import), but real.
- **Next.js App Router sources are not covered.** `Page({ searchParams })`
  and `Page({ params })` are how a GROQ query most commonly receives
  untrusted input in a Next.js Sanity app, and neither is a registered
  source — the same class of gap `no-sql-injection` documents for
  non-Express frameworks, but the primary road here rather than a side one.
- **Sanity APIs beyond `.fetch()` are not registered sinks**: `client.listen(query, params)`
  and `client.observable.fetch(query)` both take a raw GROQ query in
  argument 0 and are not covered. next-sanity's `defineLive`/`sanityFetch({ query, params })`
  puts the query in an object property rather than a positional argument —
  the GROQ analogue of the already-documented `db.query({ text, values })`
  object-form miss.

Known false positive, left deliberately unassociated with either a
regression test in false-positive.test.js or a fix: a project-local
template tag *named* `groq` that is not the npm package — one that
actually escapes its interpolations — is still recognized and treated as
pass-through, because recognition is by bare name. This mirrors the same
name-trust tradeoff `root.helper` sanitizers already accept elsewhere in
this registry; it is not asserted as a test case on purpose, so that
fixing it later (e.g. tracing the identifier to a real import of the
`groq` package) does not need to break a pinned test first.

## Prior art

No direct static-analysis prior art for GROQ specifically; the underlying
weakness class (CWE-943, unparameterized query construction) is the same one
CodeQL's and Semgrep's NoSQL-injection queries cover for MongoDB and similar
query languages.

## References

- [OWASP Top 10 A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [CWE-943: Improper Neutralization of Special Elements in Data Query Logic](https://cwe.mitre.org/data/definitions/943.html)
- [Sanity: GROQ parameters](https://www.sanity.io/docs/groq-parameters)
- [Sanity: query the Content Lake](https://www.sanity.io/docs/how-queries-work)
