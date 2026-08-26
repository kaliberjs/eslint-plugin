const { test, merge, handler } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-elasticsearch-injection.
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
 * This rule matches Elasticsearch's DSL keys with a bespoke `Property`
 * visitor rather than a registry sink shape, which produces a failure profile
 * unlike every other taint rule's. Two structural consequences run through
 * the whole corpus:
 *
 *   1. STRENGTH — the sink does not need a call. Because ESLint visits every
 *      `Property` regardless of surrounding structure, a `query_string` key
 *      is found wherever it is written: inside `Object.assign` arguments,
 *      inside a spread source, inside an array pushed into `bool.must`,
 *      inside an object that is never passed to a client at all. Rules built
 *      on a method+receiver+argument sink lose all of these.
 *
 *   2. WEAKNESS — the sink requires TWO syntactically inline object
 *      literals, one nested in the other. `checkTextProperty` returns early
 *      unless the DSL key's value is an `ObjectExpression`, and it looks for
 *      the `query` / `source` / `inline` property only among that literal's
 *      own `properties`. Any indirection at either level — a variable
 *      holding the sub-object, a later `obj.query = ...` write, a spread
 *      that carries the tainted property in, `Object.assign` — is a total
 *      miss, no matter how confidently the taint engine tracks the value
 *      itself. The taint analysis is never reached.
 *
 * And one capability gap: the rule wires `analysis.taintOf` but not
 * `reportReachableSinks`. `no-sql-injection` catches a helper that contains
 * the sink and is called with tainted arguments, same-file and cross-file;
 * this rule catches neither, because `reachableSinksOf` walks a callee body
 * looking for *registry* sinks and the DSL keys are not registry sinks. The
 * vulnerability is invisible from both ends: the caller sees no DSL key, and
 * the helper file, linted on its own, has an untainted parameter.
 *
 * Verified against `no-sql-injection` case by case, so the misses below are
 * split into two kinds:
 *   - "DESIGN" — no-sql-injection detects the equivalent shape; this is the
 *     bespoke Property-visitor design costing detection.
 *   - "INHERITED" — no-sql-injection misses it too; a shared taint-engine
 *     limitation already documented in its own corpus.
 */

const FIXTURES = `${__dirname}/../../../machinery/security/fixtures/interprocedural/src`

test('security-no-elasticsearch-injection', merge(
  {
    // === property-key evasions =========================================
    valid: [
      // MISS (DESIGN). A computed key resolved from a const. getStaticPropertyName
      // only folds a computed key that is a Literal, so `[K]` is undefined and
      // the DSL key never matches. Fully exploitable, and the plugin already
      // depends on @eslint-community/eslint-utils' getStaticValue, which
      // resolves this.
      handler(`const K = 'query_string'; const q = req.query.q; client.search({ query: { [K]: { query: q } } })`),

      // MISS (DESIGN). Computed key as a template literal with no expressions.
      handler(`const q = req.query.q; client.search({ query: { [\`query_string\`]: { query: q } } })`),

      // MISS (DESIGN). Computed key built by constant-folding concatenation.
      handler(`const q = req.query.q; client.search({ query: { ['query' + '_string']: { query: q } } })`),

      // MISS (DESIGN). The DSL key is written as an assignment, not a property
      // in a literal — there is no Property node at all. This is the ordinary
      // conditional-query-building shape, and the most likely of the key
      // evasions to occur naturally.
      handler(`const q = req.query.q; const body = {}; body.query_string = { query: q }; client.search({ query: body })`),

      // MISS (DESIGN). Same, computed.
      handler(`const q = req.query.q; const body = {}; body['query_string'] = { query: q }; client.search({ query: body })`),

      // MISS (DESIGN). Object.defineProperty — the key is a string argument.
      handler(`const q = req.query.q; const body = {}; Object.defineProperty(body, 'query_string', { value: { query: q } }); client.search({ query: body })`),

      // MISS (DESIGN). Shorthand: the Property `query_string` exists and its key
      // matches, but its value is an Identifier, not an ObjectExpression, so
      // checkTextProperty returns immediately. Naming the variable after the DSL
      // key is idiomatic and reads as *more* explicit, not less.
      handler(`const q = req.query.q; const query_string = { query: q }; client.search({ query: { query_string } })`),
    ],
    invalid: [
      // A string-literal key.
      {
        code: handler(`const q = req.query.q; client.search({ query: { 'query_string': { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const q = req.query.q; client.search({ query: { 'simple_query_string': { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // A computed key that is a plain Literal — getStaticPropertyName folds it.
      {
        code: handler(`const q = req.query.q; client.search({ query: { ['query_string']: { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`client.search({ query: { ['script']: { source: 'x' + req.query.e } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      // Object.assign and spread do NOT hide the literal: the Property visitor
      // sees it wherever it is written. A sink-shape rule would lose both.
      {
        code: handler(`const q = req.query.q; client.search({ query: Object.assign({}, { query_string: { query: q } }) })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const q = req.query.q; const qs = { query_string: { query: q } }; client.search({ query: { ...qs } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
    ],
  },

  {
    // === the `query` / `source` / `inline` sub-property =================
    valid: [
      // MISS (DESIGN). The sub-object lives in a variable. The `query_string`
      // key matches, its value is an Identifier, checkTextProperty returns.
      // Building the inner clause separately is completely ordinary code.
      handler(`const q = req.query.q; const qs = { query: q }; client.search({ query: { query_string: qs } })`),
      handler(`const s = { source: 'x' + req.query.e }; client.search({ query: { script: s } })`),

      // MISS (DESIGN). Computed sub-key resolved from a const — same
      // getStaticPropertyName limitation, one level down.
      handler(`const K = 'query'; const q = req.query.q; client.search({ query: { query_string: { [K]: q } } })`),

      // MISS (DESIGN). The tainted `query` property is carried in by a spread.
      // `properties.find` only inspects Property nodes, so a SpreadElement is
      // skipped even though the spread source is a literal in the same file.
      handler(`const q = req.query.q; const extra = { query: q }; client.search({ query: { query_string: { ...extra, default_field: 'title' } } })`),
      handler(`const src = { source: 'x' + req.query.e }; client.search({ query: { script: { ...src, lang: 'painless' } } })`),

      // MISS (DESIGN). Object.assign one level in: the value is a
      // CallExpression, not an ObjectExpression.
      handler(`const q = req.query.q; client.search({ query: { query_string: Object.assign({ default_field: 't' }, { query: q }) } })`),

      // MISS (DESIGN). Multi-write builder: the object is created, then the
      // tainted field is assigned. The "start with the static parts, add the
      // dynamic one" shape, which is how conditional queries actually get
      // written.
      handler(`const q = req.query.q; const qs = { default_field: 't' }; qs.query = q; client.search({ query: { query_string: qs } })`),
      handler(`const s = { lang: 'painless' }; s.source = 'x' + req.query.e; client.search({ query: { script: s } })`),
    ],
    invalid: [
      // String-literal and computed-literal sub-keys both fold.
      {
        code: handler(`const q = req.query.q; client.search({ query: { query_string: { 'query': q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const q = req.query.q; client.search({ query: { query_string: { ['query']: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`client.search({ query: { script: { ['source']: 'x' + req.query.e } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      // A spread that only carries the *static* parts still leaves `query` as a
      // real Property, so the mixed shape is caught.
      {
        code: handler(`const q = req.query.q; const base = { default_field: 'title' }; client.search({ query: { query_string: { ...base, query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // Shorthand `{ query }`.
      {
        code: handler(`const query = req.query.q; client.search({ query: { query_string: { query } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // The older `inline` spelling.
      {
        code: handler(`client.search({ query: { script: { inline: 'x' + req.query.e } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
    ],
  },

  {
    // === DSL shapes the key match does or does not reach =================
    valid: [
      // SCOPE, arguably not a miss. `fields` (simple_query_string) and
      // `default_field` (query_string) take field-name patterns, so tainted
      // values there let a caller aim the query at fields it should not read —
      // information disclosure rather than query-logic injection. The rule
      // checks only `query`. Recorded because the task asked whether
      // simple_query_string's extra sub-properties change anything: they do
      // not, and this is the reason.
      handler(`client.search({ query: { simple_query_string: { query: 'a', fields: [req.query.f] } } })`),
      handler(`client.search({ query: { query_string: { query: 'a', default_field: req.query.f } } })`),
    ],
    invalid: [
      // Was a recorded miss; now detected. Elasticsearch accepts a bare
      // string as shorthand for `{ source }` —
      // `"script": "ctx._source.counter += params.count"` is valid in the
      // update API and in older DSL forms. Fixed by also checking a
      // non-object `script` value directly, rather than only ever looking
      // for a `source`/`inline` sub-property.
      {
        code: handler(`client.search({ query: { script: 'doc.x.value * ' + req.query.n } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.update({ body: { script: \`ctx._source.x = \${req.query.n}\` } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      // Was a recorded miss, introduced by an earlier version of the
      // DSL-ancestor gate; now detected. In the Elasticsearch JS client
      // 8.x, `script` sits at the request root — `client.update({ index,
      // id, script: { source } })` is the canonical documented Painless
      // shape, straight out of Elastic's own docs — with no ancestor
      // Property at all above it. Fixed by also recognising a `script`
      // sitting alongside an `index`/`id`/`dest` sibling in the same
      // object, and by adding `processors` (an ingest pipeline's own
      // wrapper) to the recognised ancestor keys.
      {
        code: handler(`client.update({ index: 'i', id: '1', script: { source: 'ctx._source.x = ' + req.query.n } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.updateByQuery({ index: 'i', script: { source: 'ctx._source.x = ' + req.query.n } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.reindex({ source: { index: 'a' }, dest: { index: 'b' }, script: { source: 'x' + req.query.e } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.putScript({ id: 's', script: { source: 'x' + req.query.e } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.ingest.putPipeline({ id: 'p', processors: [{ script: { source: 'x' + req.query.e } }] })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      // The key match is context-free, so every DSL location that spells
      // `script` is covered without enumerating them.
      {
        code: handler(`client.search({ script_fields: { total: { script: { source: 'x' + req.query.e } } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.search({ runtime_mappings: { d: { type: 'long', script: { source: 'x' + req.query.e } } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      // The DSL-ancestor gate accepts these ancestors, so they stay detected.
      {
        code: handler(`client.update({ body: { script: { source: 'x' + req.query.e } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.search({ aggs: { a: { terms: { script: { source: 'x' + req.query.e } } } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      {
        code: handler(`client.search({ sort: [{ _script: { script: { source: 'x' + req.query.e } } }] })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
      // No call required at all — the object is built and returned. A
      // registry sink shape would need `client.search(...)` here.
      {
        code: handler(`const q = req.query.q; const body = { query: { query_string: { query: q } } }; return body`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const q = req.query.q; const body = { query: { query_string: { query: q } } }; client.search(body)`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // Pushed into a bool.must array built up separately.
      {
        code: handler(`const q = req.query.q; const must = []; must.push({ query_string: { query: q } }); client.search({ query: { bool: { must } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // Conditional spread into must[], and a ternary between two clause objects.
      {
        code: handler(`const q = req.query.q; client.search({ query: { bool: { must: [ ...(q ? [{ query_string: { query: q } }] : []) ] } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const q = req.query.q; client.search({ query: q ? { query_string: { query: q } } : { match_all: {} } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
    ],
  },

  {
    // === interprocedural: the rule wires no reportReachableSinks =========
    valid: [
      // MISS (DESIGN). A same-file helper CONTAINS the sink and is called with
      // tainted arguments. no-sql-injection detects the identical shape via
      // reportReachableSinks; this rule reports nothing, from either end —
      // `text` is an untainted parameter where the DSL key is written, and the
      // call site has no DSL key to match. This is the single most likely miss
      // in the corpus to exist in real code: "extract the search into a
      // function" is the first refactor anyone does.
      `function search(text) { return client.search({ query: { query_string: { query: text } } }) }
       function handler(req, res) { search(req.query.q) }`,

      `function scoreBy(expr) { return client.search({ query: { script: { source: expr } } }) }
       function handler(req, res) { scoreBy(req.query.e) }`,

      // MISS (DESIGN). Same, with interpolation inside the helper, so the
      // helper body alone looks unmistakably like query-syntax construction.
      `function search(text) { return client.search({ query: { query_string: { query: \`title:\${text}\` } } }) }
       function handler(req, res) { search(req.query.q) }`,

      // MISS (DESIGN). Two call sites, one tainted — the multiCallSite shape
      // no-sql-injection handles.
      `function search(text) { return client.search({ query: { query_string: { query: text } } }) }
       function untainted() { search('static') }
       function handler(req, res) { search(req.query.q) }`,

      // MISS (DESIGN). A default parameter value; no-sql-injection detects this.
      `function search(text = '') { client.search({ query: { query_string: { query: text } } }) }
       function handler(req, res) { search(req.query.q) }`,

      // MISS (DESIGN). An object method containing the sink. no-sql-injection
      // detects this one (localMethodFor); this rule does not.
      `const repo = { search(text) { client.search({ query: { query_string: { query: text } } }) } }
       function handler(req, res) { repo.search(req.query.q) }`,

      // MISS (DESIGN). A same-file helper RETURNS the DSL shape. The Property
      // node lives in the helper's return statement, where the value is an
      // untainted parameter; the call site has no Property to visit. Note that
      // no-sql-injection's equivalent (a helper returning a tainted string) IS
      // detected, because there the sink is at the call site and only the
      // *value* crosses the function boundary. Here the sink itself does.
      `function buildQuery(text) { return { query_string: { query: text } } }
       function handler(req, res) { client.search({ query: buildQuery(req.query.q) }) }`,

      `const buildQuery = text => ({ query_string: { query: text } })
       function handler(req, res) { client.search({ query: buildQuery(req.query.q) }) }`,

      `function buildScript(expr) { return { script: { source: expr } } }
       function handler(req, res) { client.search({ query: { script_score: buildScript(req.query.e) } }) }`,

      // MISS (INHERITED). A class method containing the sink — no-sql-injection
      // misses this too.
      `class Repo { search(text) { client.search({ query: { query_string: { query: text } } }) } }
       function handler(req, res) { new Repo().search(req.query.q) }`,

      // MISS (DESIGN). Cross-file: the helper contains the sink. See
      // machinery/security/fixtures/interprocedural/src/esHelpers.js.
      // no-sql-injection detects the cross-file equivalent through
      // reachableSinksOfCrossFile.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { searchByText } from './esHelpers'
               export function handler(req, res) { searchByText(req.query.q) }`,
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { scoreByExpression } from './esHelpers'
               export function handler(req, res) { scoreByExpression(req.query.e) }`,
      },
      // MISS (DESIGN). Cross-file: the helper returns the DSL shape.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { buildQueryString } from './esHelpers'
               export function handler(req, res) { client.search({ query: buildQueryString(req.query.q) }) }`,
      },
    ],
    invalid: [],
  },

  {
    // === the shared taint engine, reaching a DSL sub-property ============
    // These confirm the standard flows carry over to this rule's `nosql` and
    // `code` kind checking. Every miss in this block is INHERITED: verified
    // against no-sql-injection, which misses the identical flow.
    valid: [
      // MISS (INHERITED). Array.join.
      handler(`client.search({ query: { query_string: { query: ['title:', req.query.q].join('') } } })`),
      // MISS (INHERITED). IIFE.
      handler(`client.search({ query: { query_string: { query: (() => req.query.q)() } } })`),
      // MISS (INHERITED). await.
      `async function handler(req, res) { const q = await Promise.resolve(req.query.q); client.search({ query: { query_string: { query: q } } }) }`,
      // MISS (INHERITED). .then callback parameter.
      `function handler(req, res) { Promise.resolve(req.query.q).then(q => client.search({ query: { query_string: { query: q } } })) }`,
      // MISS (INHERITED). A class field written in the constructor.
      `class S { constructor(req) { this.q = req.query.q } run() { client.search({ query: { query_string: { query: this.q } } }) } }`,
      // MISS (INHERITED). A getter.
      `class Req { constructor(req) { this.req = req } get q() { return this.req.query.q } }
       function handler(req, res) { client.search({ query: { query_string: { query: new Req(req).q } } }) }`,
      // MISS (INHERITED). String.raw / tagged template.
      handler(`client.search({ query: { query_string: { query: String.raw\`title:\${req.query.q}\` } } })`),
      // MISS (INHERITED). A callback parameter bound from a tainted array.
      handler(`client.search({ query: { bool: { should: req.query.terms.map(t => ({ query_string: { query: t } })) } } })`),
    ],
    invalid: [
      {
        code: handler(`client.search({ query: { query_string: { query: \`title:\${req.query.q}\` } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      // A template nested in a template.
      {
        code: handler(`const inner = \`\${req.query.q}\`; client.search({ query: { query_string: { query: \`title:\${inner}\` } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      {
        code: handler(`client.search({ query: { query_string: { query: 'title:'.concat(req.query.q) } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      // += accumulation, and += inside a loop.
      {
        code: handler(`let s = 'title:'; s += req.query.q; client.search({ query: { query_string: { query: s } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`let q = ''; for (const t of req.query.terms) { q += t } client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // Destructuring: plain, nested+renamed, defaulted, rest.
      {
        code: handler(`const { q } = req.query; client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const { query: { q: term } } = req; client.search({ query: { query_string: { query: term } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const { q = '' } = req.query; client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`const { a, ...rest } = req.query; client.search({ query: { query_string: { query: rest.q } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      // Alias and reassignment chains.
      {
        code: handler(`const a = req.query; const b = a; client.search({ query: { query_string: { query: b.q } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      {
        code: handler(`let x = req.query.q; let y = x; let z = y; client.search({ query: { query_string: { query: z } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // Logical and nullish defaults.
      {
        code: handler(`const q = req.query.q || 'x'; client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      {
        code: handler(`const q = req.query.q ?? 'x'; client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      // Computed member access, optional chaining, comma operator.
      {
        code: handler(`const k = 'q'; client.search({ query: { query_string: { query: req.query[k] } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`client.search({ query: { query_string: { query: req.query?.q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`client.search({ query: { query_string: { query: (0, req.query.q) } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // try/catch across both writes.
      {
        code: handler(`let q; try { q = req.query.q } catch (e) { q = '' } client.search({ query: { query_string: { query: q } } })`),
        errors: [{ messageId: 'luceneInjectionQualified' }],
      },
      // Other request sources.
      {
        code: handler(`client.search({ query: { query_string: { query: req.body.q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      {
        code: handler(`client.search({ query: { query_string: { query: req.params.q } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // Kind checking: encodeURIComponent clears neither `nosql` nor `code`,
      // so it must not silence the finding.
      {
        code: handler(`client.search({ query: { query_string: { query: encodeURIComponent(req.query.q) } } })`),
        errors: [{ messageId: 'luceneInjection' }],
      },
      // The script source assembled in a variable first.
      {
        code: handler(`const expr = 'doc.x.value * ' + req.query.n; client.search({ query: { script_score: { script: { source: expr } } } })`),
        errors: [{ messageId: 'scriptInjectionQualified' }],
      },
    ],
  },
))
