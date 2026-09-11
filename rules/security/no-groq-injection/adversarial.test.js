const { test, merge, handler } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-groq-injection.
 *
 * Every case here was run against the real rule before being written down.
 *
 *   invalid  -> the evasion is DETECTED. It is a regression test: this shape
 *               must keep being reported.
 *   valid    -> the evasion is MISSED. The comment states the real
 *               vulnerability that goes unreported.
 *
 * A `valid` case in this file is never a claim that the code is safe unless
 * the comment says so explicitly ("SAFE"). It is a record of a false
 * negative. Nothing here was weakened to make it pass.
 *
 * ---------------------------------------------------------------------------
 *
 * The taint mechanics are shared with no-sql-injection, so most of that
 * rule's adversarial corpus applies unchanged and is not duplicated here.
 * This file records what is *specific to GROQ*: the `groq` tag recognition
 * path, the Sanity client receiver shapes, and query-fragment composition.
 *
 * The three highest-impact misses found, in order of how likely a real
 * developer is to write the shape:
 *
 *   1. A chained receiver. `client.withConfig({ token }).fetch(q)` and
 *      `getClient(preview).fetch(q)` are the canonical next-sanity preview
 *      patterns — arguably more common in a Next.js Sanity app than the bare
 *      `client.fetch(q)` the rule is built around. matchesReceiver() only
 *      accepts an Identifier or a MemberExpression, so a CallExpression
 *      receiver matches nothing and the sink never fires. See the note on
 *      that block: the one-line recursion that closes it also introduces a
 *      SQL false positive, so the fix has to be sink-scoped.
 *
 *   2. `defineQuery()`. Sanity TypeGen requires queries to be wrapped in
 *      next-sanity's `defineQuery`, which is a verified identity function —
 *      the same "no-op wrapper for tooling" shape as the `groq` tag itself,
 *      and unrecognised, so it is a wall. Modern Sanity codebases wrap
 *      essentially every query in it.
 *
 *   3. Next.js App Router `searchParams` / `params`. Sanity is overwhelmingly
 *      used from Next.js, where untrusted input arrives as a destructured
 *      page prop rather than through `req`. Inherited from the source
 *      registry (no-sql-injection records the same gap for Koa/Lambda), but
 *      the impact is much larger here because it is the *primary* way a GROQ
 *      query gets user input.
 *
 * Not a false negative, recorded here because it is the cost of recognising
 * the tag by bare name: a project-local template tag that happens to be
 * called `groq` and *does* escape its interpolations is reported anyway.
 *
 *   function groq(strings, ...keys) {
 *     return strings.reduce((a, s, i) => a + s + escapeGroq(keys[i] ?? ''), '')
 *   }
 *   client.fetch(groq`*[slug == "${req.query.s}"]`)   // reported, wrongly
 *
 * Left unasserted on purpose: locking it into `invalid` would turn a future
 * fix into a test failure.
 */

const FIXTURES = `${__dirname}/../../../machinery/security/fixtures/interprocedural/src`

test('security-no-groq-injection', merge(
  {
    // --- `groq` tag recognition -------------------------------------------
    valid: [
      // ADVERSARIAL MISS: the tag is recognised by bare name, never traced to
      // the `groq` package, so any rename of the import defeats it. All three
      // of these are the same no-op concatenating tag under a different
      // identifier, and all three are unreported.
      `import { groq as g } from 'groq'
       function handler(req) { const s = req.query.s; client.fetch(g\`*[slug.current == "\${s}"]\`) }`,
      `import q from 'groq'
       function handler(req) { const s = req.query.s; client.fetch(q\`*[slug.current == "\${s}"]\`) }`,
      `import * as G from 'groq'
       function handler(req) { const s = req.query.s; client.fetch(G.groq\`*[slug.current == "\${s}"]\`) }`,
      // ADVERSARIAL MISS: same tag, aliased to a local const. The tag
      // expression is an Identifier named `g`, so resolveTaggedTemplate bails.
      handler('const g = groq; const s = req.query.s; client.fetch(g`*[slug.current == "${s}"]`)'),
      // ADVERSARIAL MISS: the tag reached through any member expression.
      handler('const s = req.query.s; client.fetch(tags.groq`*[slug.current == "${s}"]`)'),
      // ADVERSARIAL MISS: `defineQuery` is next-sanity's typegen marker and a
      // verified identity function (`query => query`). Sanity TypeGen requires
      // it, so in a typed codebase nearly every query is wrapped in it — and
      // it is an unknown call, so the flow dies at the wrapper. The same-file
      // `const defineQuery = q => q` spelling IS detected (helper summaries
      // resolve it — see the invalid block), which is the tell that only the
      // import shape is missing.
      `import { defineQuery } from 'next-sanity'
       function handler(req) {
         const s = req.query.s
         client.fetch(defineQuery(groq\`*[slug.current == "\${s}"]\`))
       }`,
      // ADVERSARIAL MISS: String.raw is a pure string builder. Already
      // recorded in no-sql-injection's corpus; repeated here because a GROQ
      // query is exactly the kind of string someone reaches for String.raw on.
      handler('const s = req.query.s; client.fetch(String.raw`*[slug.current == "${s}"]`)'),
    ],
    invalid: [
      // A tainted interpolation nested one template deep inside the tag.
      {
        code: handler('const s = req.query.s; client.fetch(groq`*[slug.current == "${`${s}`}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // A groq-tagged template nested inside a plain one.
      {
        code: handler('const s = req.query.s; client.fetch(`${groq`*[slug.current == "${s}"]`}`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Concatenation inside the interpolation.
      {
        code: handler("const s = req.query.s; client.fetch(groq`*[slug.current == \"${'p-' + s}\"]`)"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // A string method applied to the tag's result.
      {
        code: handler('const s = req.query.s; client.fetch(groq`*[slug.current == "${s}"]`.trim())'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Logical and conditional fallbacks around the tainted interpolation.
      {
        code: handler("const s = req.query.s; client.fetch(groq`*[slug.current == \"${s ?? 'home'}\"]`)"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler("const s = req.query.s; client.fetch(groq`*[slug.current == \"${s ? s : 'home'}\"]`)"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // A same-file identity wrapper — the shape `defineQuery` has, resolved
      // through a helper summary rather than the tag path.
      {
        code: `const defineQuery = q => q
               function handler(req) { const s = req.query.s; client.fetch(defineQuery(groq\`*[slug.current == "\${s}"]\`)) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Parenthesised tag expression.
      {
        code: handler('const s = req.query.s; client.fetch((groq`*[slug.current == "${s}"]`))'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },

  {
    // --- receiver / callee resolution --------------------------------------
    //
    // matchesReceiver() accepts an Identifier or a MemberExpression and
    // nothing else, and it matches on the *name at the call site* with no
    // alias resolution. Everything below follows from those two facts.
    valid: [
      // ADVERSARIAL MISS, and the worst one in this file: a chained receiver.
      // `client.withConfig({ token, perspective: 'previewDrafts' })` is how
      // next-sanity switches into preview mode, and `getClient(preview)` is
      // the older spelling of the same thing from Sanity's own Next.js
      // starters. Both are ordinary, recommended code and both are invisible:
      // the receiver is a CallExpression.
      handler('const s = req.query.s; client.withConfig({ useCdn: false }).fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; previewClient.withConfig({ token }).fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; sanityClient.clone().fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; getClient(false).fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; useClient().fetch(groq`*[slug.current == "${s}"]`)'),
      // Recursing matchesReceiver through a CallExpression callee closes the
      // first three of those in one line — and simultaneously makes
      // `db.prepare(sql).get(req.params.id)` a SQL false positive, which is
      // the exact case registry.js#sql.statement.run documents as
      // deliberately excluded. Verified both directions. So the fix belongs
      // on the sink entry (an opt-in "receiver may be a pass-through call"
      // flag, or a named allowlist of withConfig/clone), not in the shared
      // matcher.

      // ADVERSARIAL MISS: the client aliased to a shorter local name, and the
      // renamed-destructure spelling of the same thing. Named receivers with
      // no alias resolution means `c` matches nothing.
      handler('const c = client; const s = req.query.s; c.fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const { client: c } = deps; const s = req.query.s; c.fetch(groq`*[slug.current == "${s}"]`)'),
      // ADVERSARIAL MISS: a client held in an array or map — multi-tenant /
      // per-locale client dispatch.
      handler('const s = req.query.s; clients[0].fetch(groq`*[slug.current == "${s}"]`)'),

      // ADVERSARIAL MISS: real, documented Sanity client APIs that take a
      // GROQ query in argument 0 and are not registered as sinks at all.
      // `client.listen(query, params)` opens a realtime listener;
      // `client.observable.fetch(query)` is the RxJS form of fetch (and its
      // receiver, `client.observable`, has the wrong property name anyway).
      handler('const s = req.query.s; client.listen(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; client.observable.fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; client.observable.listen(groq`*[slug.current == "${s}"]`)'),
      // ADVERSARIAL MISS: next-sanity's `sanityFetch({ query, params })` (the
      // defineLive API). No receiver at all, and the query is a property of an
      // object argument — the GROQ twin of the pg `db.query({ text })` miss
      // already recorded in no-sql-injection's corpus.
      handler('const s = req.query.s; sanityFetch({ query: groq`*[slug.current == "${s}"]` })'),
      handler('const s = req.query.s; client.fetch({ query: groq`*[slug.current == "${s}"]` })'),

      // ADVERSARIAL MISS: invocation shapes sinkAt() rejects because the
      // callee is not literally a MemberExpression, or the argument is a
      // SpreadElement. All inherited from no-sql-injection.
      handler('const s = req.query.s; (0, client.fetch)(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; client.fetch.call(client, groq`*[slug.current == "${s}"]`)'),
      handler('const { fetch } = client; const s = req.query.s; fetch(groq`*[slug.current == "${s}"]`)'),
      handler('const s = req.query.s; const q = groq`*[slug.current == "${s}"]`; client.fetch(...[q])'),
    ],
    invalid: [
      // The receiver name is matched wherever it sits, so a namespaced or
      // per-request client works as long as the *last* property is a known
      // name.
      {
        code: handler('const s = req.query.s; sanity.client.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const s = req.query.s; deps.client.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // `this.client` — the shape a service class uses.
      {
        code: 'class S { constructor(c) { this.client = c } run(req) { const s = req.query.s; this.client.fetch(groq`*[slug.current == "${s}"]`) } }',
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Destructured under its own name, and imported from the module that
      // constructs it — the standard `sanity/lib/client` layout.
      {
        code: handler('const { client } = deps; const s = req.query.s; client.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: `import { client } from './sanityClient'
               function handler(req) { const s = req.query.s; client.fetch(groq\`*[slug.current == "\${s}"]\`) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: 'const client = createClient({ projectId }); function handler(req) { const s = req.query.s; client.fetch(groq`*[slug.current == "${s}"]`) }',
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Optional call, folded computed method name, case-insensitive receiver.
      {
        code: handler('const s = req.query.s; client?.fetch?.(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler("const m = 'fetch'; const s = req.query.s; client[m](groq`*[slug.current == \"${s}\"]`)"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const s = req.query.s; SanityClient.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // await, and inside a .then callback.
      {
        code: 'async function handler(req) { const s = req.query.s; await client.fetch(groq`*[slug.current == "${s}"]`) }',
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const s = req.query.s; Promise.resolve().then(() => client.fetch(groq`*[slug.current == "${s}"]`))'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Extra arguments do not launder argument 0: a tainted query with a
      // params object and a Next.js fetch-options object is still a finding.
      {
        code: handler('const s = req.query.s; client.fetch(groq`*[slug.current == "${s}"]`, { a: 1 }, { next: { revalidate: 60 } })'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const s = req.query.s; const q = groq`*[slug.current == "${s}"]`; client.fetch(q, { a: 1 })'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },

  {
    // --- delegation: the sink lives behind a helper -------------------------
    valid: [],
    invalid: [
      // Same-file helper, taint entering as the value…
      {
        code: `function run(s) { return client.fetch(groq\`*[slug.current == "\${s}"]\`) }
               function handler(req) { run(req.query.s) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // …as the whole query string…
      {
        code: `function run(q) { return client.fetch(q) }
               function handler(req) { const s = req.query.s; run(groq\`*[slug.current == "\${s}"]\`) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // …through an arrow const, and through a method on an exported object.
      {
        code: 'const run = s => client.fetch(groq`*[slug.current == "${s}"]`)\nfunction handler(req) { run(req.query.s) }',
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: 'export const api = { run(s) { return client.fetch(groq`*[slug.current == "${s}"]`) } }\nfunction handler(req) { api.run(req.query.s) }',
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Across a file boundary, both directions: the helper builds the query
      // from a tainted argument, and the helper receives a tainted query.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { runQuery } from './groqHelpers'
               function handler(req) { runQuery(req.query.s) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { runQueryString } from './groqHelpers'
               function handler(req) { runQueryString(groq\`*[slug.current == "\${req.query.s}"]\`) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // An async helper returning the tainted query, awaited at the sink.
      {
        code: `async function build(s) { return groq\`*[slug.current == "\${s}"]\` }
               async function handler(req) { client.fetch(await build(req.query.s)) }`,
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },

  {
    // --- query-fragment composition ----------------------------------------
    //
    // The dominant real-world GROQ shape: an outer query assembled from
    // locally-defined projection fragments. Static fragments must stay quiet
    // (asserted in test.js and below); a fragment that is *itself* built from
    // untrusted input must not.
    valid: [
      // ADVERSARIAL MISS: a tainted fragment parked on an object property, or
      // in an array that is joined. Limitation 2 (containers), inherited —
      // but fragment *registries* (`const fragments = { post: …, page: … }`)
      // are how larger Sanity codebases organise query text, so the container
      // shape is more idiomatic here than it is for SQL.
      handler('const s = req.query.s; const f = { where: groq`slug.current == "${s}"` }; client.fetch(groq`*[${f.where}]`)'),
      handler("const s = req.query.s; const parts = [groq`slug.current == \"${s}\"`]; client.fetch(groq`*[${parts.join(' && ')}]`)"),
      // ADVERSARIAL MISS: the fragment selected out of a lookup table by a
      // tainted key. The values are developer-authored, so the *fragment* is
      // safe — but the missing piece is that nothing checks the key is one of
      // them; `?f=__proto__` and friends aside, this is mostly recorded for
      // completeness. Lowest priority in this file.
      handler('const frags = { a: groq`{title}`, b: groq`{body}` }; client.fetch(groq`*[_type == "p"] ${frags[req.query.f]}`)'),
      // ADVERSARIAL MISS: a tainted fragment exported from another file.
      // Limitation 1 (cross-file), inherited.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { frag } from './groqFragments'
               function handler(req) { client.fetch(groq\`*[\${frag}]\`) }`,
      },

      // SAFE — these must never report.
      // A static fragment composed into an outer query, same file and
      // cross-file. This is the pattern the rule exists alongside, not
      // against.
      'const fields = groq`{ title, slug }`\nconst filter = groq`_type == "post"`\nfunction handler(req) { client.fetch(groq`*[${filter}] ${fields}`) }',
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { postFields } from './groqHelpers'
               function handler(req) { client.fetch(groq\`*[_type == "post"] \${postFields}\`) }`,
      },
      // A constant interpolated into the query text alongside a *parameterised*
      // untrusted value.
      handler("const T = 'post'; client.fetch(groq`*[_type == \"${T}\" && slug.current == $slug]`, { slug: req.query.s })"),
    ],
    invalid: [
      // A fragment built from a browser source at module scope.
      {
        code: "const dir = new URLSearchParams(location.search).get('d')\nconst frag = groq`| order(${dir})`\nclient.fetch(groq`*[_type == \"post\"] ${frag}`)",
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // A fragment produced by a function, and a three-level fragment chain.
      {
        code: handler('function frag(s) { return groq`slug.current == "${s}"` } const s = req.query.s; client.fetch(groq`*[${frag(s)}]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const s = req.query.s; const a = groq`slug.current == "${s}"`; const b = groq`${a} && published`; client.fetch(groq`*[${b}]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Mixed chains: tagged fragment into a plain outer template and into a
      // concatenation, and a plain fragment into a tagged outer query.
      {
        code: handler('const s = req.query.s; const frag = groq`slug.current == "${s}"`; client.fetch(`*[${frag}]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler("const s = req.query.s; const frag = groq`slug.current == \"${s}\"`; client.fetch('*[' + frag + ']')"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const s = req.query.s; const frag = `slug.current == "${s}"`; client.fetch(groq`*[${frag}]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Conditional fragment appended with +=, and a filter accumulated in a
      // loop over a tainted array — the two ways a "search" endpoint is
      // actually written.
      {
        code: handler('let q = groq`*[_type == "p"]`; if (req.query.f) q += groq` && slug.current == "${req.query.f}"`; client.fetch(q)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler("let f = ''; for (const t of req.body.tags) { f += ` || \"${t}\" in tags` } client.fetch(groq`*[${f}]`)"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Injection into positions that are not a value at all — the reason
      // parameterisation cannot be retrofitted onto these and the finding
      // matters: ordering, projection and slice bounds take no `$param`.
      {
        code: handler('const dir = req.query.dir; client.fetch(groq`*[_type == "p"] | order(title ${dir})`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const f = req.query.field; client.fetch(groq`*[_type == "p"]{ "v": ${f} }`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const n = req.query.n; client.fetch(groq`*[_type == "p"][0...${n}]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },

  {
    // --- source reach, through the groq tag --------------------------------
    valid: [
      // ADVERSARIAL MISS: Next.js App Router page props. Sanity's primary
      // deployment target, and the primary way a GROQ query gets untrusted
      // input in one. `searchParams`/`params` are not registered sources and
      // arrive destructured, so both halves of the flow are invisible.
      'export default async function Page({ searchParams }) { const s = searchParams.q; return client.fetch(groq`*[slug.current == "${s}"]`) }',
      'export default async function Page({ params }) { return client.fetch(groq`*[slug.current == "${params.slug}"]`) }',
      'export default async function Page(props) { const s = props.searchParams.q; return client.fetch(groq`*[slug.current == "${s}"]`) }',
      // ADVERSARIAL MISS: the client-side equivalents.
      'function C() { const sp = useSearchParams(); return client.fetch(groq`*[slug.current == "${sp.get("q")}"]`) }',
      'function C() { const router = useRouter(); return client.fetch(groq`*[slug.current == "${router.query.q}"]`) }',
      // ADVERSARIAL MISS: destructured handler parameter. Limitation 4,
      // inherited.
      'function handler({ query }, res) { client.fetch(groq`*[slug.current == "${query.s}"]`) }',

      // SAFE — shadowing means the inner `req` is a local object.
      'function handler(req) { { const req = { query: { s: 1 } }; client.fetch(groq`*[slug.current == "${req.query.s}"]`) } }',
    ],
    invalid: [
      // Express/Fastify request objects, and browser globals.
      {
        code: 'async function h(request, reply) { client.fetch(groq`*[slug.current == "${request.query.q}"]`) }',
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: 'client.fetch(groq`*[slug.current == "${location.search}"]`)',
        errors: [{ messageId: 'groqInjection' }],
      },
      {
        code: 'client.fetch(groq`*[slug.current == "${document.referrer}"]`)',
        errors: [{ messageId: 'groqInjection' }],
      },
      // Alias and destructuring chains into the tag.
      {
        code: handler('const q = req.query; const p = q.slug; const s = p; client.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler("const { query: { slug: s = '' } } = req; client.fetch(groq`*[slug.current == \"${s}\"]`)"),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler('const { a, ...rest } = req.query; client.fetch(groq`*[slug.current == "${rest.slug}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // Multi-write through try/catch.
      {
        code: handler('let q = groq`*[_type == "p"]`; try { q = groq`*[slug.current == "${req.query.s}"]` } catch (e) {} client.fetch(q)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // encodeURIComponent clears `url`, not `nosql`. Still reported, and
      // correctly: percent-encoding does not neutralise GROQ syntax.
      {
        code: handler('const s = encodeURIComponent(req.query.s); client.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      // String() coercion.
      {
        code: handler('const s = String(req.query.s); client.fetch(groq`*[slug.current == "${s}"]`)'),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },

  {
    // --- flow shapes that are walls for the shared engine -------------------
    // All inherited from no-sql-injection's corpus, re-recorded through a
    // groq-tagged query because the tag is a new resolution path and it was
    // worth confirming it does not change any of these verdicts. It does not.
    valid: [
      // Limitation 3 (unknown calls): IIFE, then-callback, awaited promise.
      handler('client.fetch((() => groq`*[slug.current == "${req.query.s}"]`)())'),
      handler('const s = req.query.s; Promise.resolve(groq`*[slug.current == "${s}"]`).then(q => client.fetch(q))'),
      'async function handler(req) { const s = await Promise.resolve(req.query.s); client.fetch(groq`*[slug.current == "${s}"]`) }',
      // Limitation 2 (containers): getter, Object.assign, array join.
      handler('const o = { get s() { return req.query.s } }; client.fetch(groq`*[slug.current == "${o.s}"]`)'),
      handler('const p = Object.assign({}, req.query); client.fetch(groq`*[slug.current == "${p.s}"]`)'),
      handler("const s = req.query.s; client.fetch(['*[slug.current == \"', s, '\"]'].join(''))"),
      // Limitation 6 (class instance state).
      'class R { constructor(req) { this.s = req.query.s } run() { client.fetch(groq`*[slug.current == "${this.s}"]`) } }',
      // JSON.stringify of a tainted object: escaped for JSON, not for GROQ.
      handler('const s = JSON.stringify(req.body.f); client.fetch(groq`*[slug.current == ${s}]`)'),
    ],
    invalid: [],
  },

  {
    // --- parameterisation must stay quiet ----------------------------------
    // The safe channel is argument 1. None of these may report — a false
    // positive on the recommended pattern is how a security rule gets
    // switched off.
    valid: [
      handler('const s = req.query.s; client.fetch(groq`*[slug.current == $slug]`, { slug: s })'),
      handler('client.fetch(groq`*[slug.current == $slug]`, { ...req.query })'),
      handler('const params = { slug: req.query.s }; client.fetch(groq`*[slug.current == $slug]`, params)'),
      handler("const s = req.query.s; client.fetch(groq`*[slug.current == $slug]`, { slug: s }, { perspective: 'published' })"),
      handler('const k = req.query.k; client.fetch(groq`*[slug.current == $slug]`, { [k]: 1 })'),
      // A receiver that is not a Sanity client handle.
      handler('someOtherObject.fetch(groq`*[slug.current == "${req.query.s}"]`)'),
      // A static query, tagged and untagged.
      "client.fetch(groq`*[_type == 'settings'][0]`)",
      "client.fetch('*[_type == \"settings\"][0]')",
    ],
    invalid: [],
  },
))
