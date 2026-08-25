# security-no-elasticsearch-injection

Detects untrusted input flowing into an Elasticsearch `query_string` /
`simple_query_string` (Lucene syntax injection) or a Painless script.

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-943: Improper Neutralization of Special Elements in Data Query Logic](https://cwe.mitre.org/data/definitions/943.html) (query_string) / [CWE-95: Eval Injection](https://cwe.mitre.org/data/definitions/95.html) (script)
- **Severity:** high · **Confidence:** varies per finding, reported in the message

## What it detects

Elasticsearch's query DSL is a JSON tree, not a call with a fixed sink
argument — so this rule matches the DSL's own keys directly, wherever they
appear in an object literal, rather than a method+receiver+argument sink
shape:

```
req.query.q  ->  q  ->  { query_string: { query: q } }  ->  client.search(...)
   source       alias         DSL construction                the call
```

Two independent sinks, both reached by matching the object property whose
value carries the tainted text:

- **`query_string` / `simple_query_string`** — Elasticsearch parses this
  field's `query` text as Lucene query syntax. Special characters
  (`+ - && || ! ( ) { } [ ] ^ " ~ * ? : \`) change what the query *does*,
  not just what it matches — the same class of weakness as SQL injection,
  expressed in Lucene's grammar instead of SQL's.
- **`script` / `script_score.script`** — a `source` (or the older
  `inline`) field is compiled and run as Painless. Untrusted input there
  is arbitrary code execution inside the cluster, the same class `no-eval`
  covers for Node's `vm` module.

Both are matched at any nesting depth (`bool.must[].query_string...`), because
a real query DSL tree is rarely flat.

## Incorrect

```js
const q = req.query.q
client.search({ query: { query_string: { query: q } } })
```

A value of `title:foo OR 1=1` changes which documents match, entirely
independent of what `title:` was supposed to constrain.

```js
client.search({
  query: {
    script_score: {
      script: { source: 'params.query_vector + ' + req.query.expr },
    },
  },
})
```

## Correct

```js
const q = req.query.q
client.search({ query: { match: { title: q } } })       // literal value, not query syntax
client.search({ query: { multi_match: { query: q, fields: ['title', 'body'] } } })
```

`match`, `term` and `multi_match` treat their value as data to search for,
never as query syntax to parse — the direct Elasticsearch equivalent of a
parameterized SQL query. If `query_string` syntax (phrase matching,
boolean operators, field boosting) is genuinely needed, escape Lucene's
reserved characters before building it, or route the query through a
project's existing escaping helper if one exists.

```js
client.search({
  query: {
    script_score: {
      script: {
        source: "cosineSimilarity(params.query_vector, 'embedding')",
        params: { query_vector: req.body.vector },   // numeric data, not source text
      },
    },
  },
})
```

## The dominant real pattern is already safe, and stays invisible on purpose

Every Elasticsearch-backed project surveyed builds `query_string` through a
shared helper (`@kaliber/elasticsearch`'s query builders) that escapes
Lucene's reserved characters before constructing the DSL object internally:

```js
// The consumer's own source never writes `query_string` at all — the
// helper does, inside its own module. This rule has nothing to match here.
client.search({ index, request: search(['title^3', 'body'], req.query.q) })
```

This is deliberate, not a gap: the rule exists to catch a *direct*
`query_string` / `simple_query_string` construction that bypasses an
escaping helper like this one, not to re-flag the helper call itself.

## Sanitization is typed

A sanitizer clears specific *kinds*. `query_string`/`simple_query_string`
require the `nosql` kind (the same one `no-groq-injection` uses — both are
unparameterized query-language injection); `script` requires `code` (the
same kind `no-eval` uses for `vm` module sinks). `encodeURIComponent`
clears neither, so it does not silence either finding.

## Configuration

The rule itself takes no options. The analysis is configured through
shared settings — see `no-sql-injection`'s readme for the full settings
shape, which this rule shares.

## Limitations

Stated honestly, inherited from the shared taint analysis (see
`no-sql-injection`'s readme for the full list):

- Cross-file flows, object/array/container properties, unknown function
  calls, destructured handler parameters, loops/recursion, and chains
  longer than `maxHops` are not detected.
- `query_string` / `simple_query_string` are matched by property name
  alone, with no surrounding call context required — unlike
  `no-groq-injection`'s `client.fetch()`, these names are specific enough
  to Elasticsearch's own DSL vocabulary, and requiring an object value
  with a nested `query` sub-property narrows it further. A project that
  builds an unrelated `{ query_string: { query: x } }`-shaped object for
  something else entirely (a URL descriptor, an APM/Sentry-shaped request
  context) is a false-positive risk this trade-off accepts — rare enough
  in practice that an independent false-positive pass judged it worth
  shipping as-is rather than adding the ancestor requirement `script` has.
- `script` / `script_score.script`, by contrast, needed more than a
  property name: `script` and its `source` sub-key are ordinary English
  words that a `<script>` tag descriptor, a build-step definition, or a
  code-editor config all use for something unrelated to Elasticsearch. An
  independent false-positive pass confirmed this fired at high confidence
  on exactly those shapes. Fixed by requiring a `script` property to
  either sit somewhere underneath a recognizable query-DSL ancestor key
  (`query`, `bool`, `must`, `should`, `filter`, `function_score`, `sort`,
  `processors`, etc.), or be a direct sibling of an `index`/`id`/`dest`
  key in the same object — the canonical `client.update({ index, id,
  script })` / `updateByQuery` / `reindex` / `putScript` shape, which sits
  at the request root with no DSL wrapping it at all. A hoisted DSL
  fragment assembled with neither an ancestor nor a sibling in scope, and
  spread in later (`const frag = { script: {...} }; client.search({ query:
  { script_score: frag } })`), is a false negative — the trade-off's
  actual remaining cost, found and fixed once already for the more common
  request-root case by an adversarial pass before this shipped.
- Elasticsearch also accepts a bare-string `script` (shorthand for
  `{ source: '<the same string>' }`) — checked directly, not just the
  object-with-`source`/`inline` shape.
- **Extracting the search into a helper function is a false negative in
  both directions**: `function search(text) { client.search({ query: {
  query_string: { query: text } } }) }` called with `req.query.q` is
  invisible whether the helper is linted alone (its parameter is
  untainted on its own) or from the call site (the call site has no DSL
  key at all to match — this rule's bespoke property-matching design does
  not fit the registry-driven `reportReachableSinks` mechanism
  `no-sql-injection` uses for the identical delegate-call shape).
- **A DSL fragment assembled across statements** (`const qs = { query: 'a' };
  qs.query = req.query.q; client.search({ query: { query_string: qs } })`)
  or **carried in via a spread** (`{ query_string: { ...extra } }` where
  `extra`'s `query` property is tainted) is not traced — the same
  no-property-assignment, no-object-heap-model limitation
  `no-sql-injection`'s readme already documents for SQL.
- **A computed key resolved through a constant** (`const K = 'query_string';
  { [K]: {...} }`) is not recognised: the shared `getStaticPropertyName`
  helper folds a computed `Literal` key but not a `const` reference or a
  template literal, and this rule (like every other rule using that
  helper) inherits that.

## Considered and deferred

**Index-name injection** (`client.search({ index: untrustedValue })`,
accessing an unintended index) is a real, distinct CWE-943-adjacent risk
in principle, but no instance — hardcoded, config-resolved, or
otherwise — was found across any Elasticsearch-backed project surveyed;
every `index` argument traced back to a fixed, server-side allowlist. Not
built for the same reason `no-xxe` was scoped to what the sweep actually
found: a rule with zero real targets is speculative, and the shape does
not fit this rule's per-property matching (an `index` argument sits
alongside the DSL, not nested inside it) — it would need the standard
method+receiver+argument sink shape `no-sql-injection`/`no-groq-injection`
use instead. Worth adding if a real instance ever surfaces.

## Prior art

No direct static-analysis prior art for Elasticsearch's `query_string`
specifically; the underlying weakness class (CWE-943) is the same one
CodeQL's and Semgrep's NoSQL-injection queries cover for MongoDB and
similar query languages. The `script` sink follows the same reasoning as
CodeQL's and Semgrep's code-injection queries for `eval`/`vm`-family
sinks.

## References

- [OWASP Top 10 A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [CWE-943: Improper Neutralization of Special Elements in Data Query Logic](https://cwe.mitre.org/data/definitions/943.html)
- [Elasticsearch: query_string query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html)
- [Elasticsearch: Painless scripting language](https://www.elastic.co/guide/en/elasticsearch/painless/current/index.html)
