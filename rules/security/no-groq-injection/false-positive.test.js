const { describe } = require('node:test')
const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for `no-groq-injection`.
 *
 * Every case in this file is *safe, ordinary, idiomatic* code. None of it is
 * a vulnerability. Two parts:
 *
 *   1. CLEAN — the rule is quiet. Regression tests.
 *   2. WAS FAILING — a confirmed false-positive family found by an
 *      independent false-positive pass and fixed before this shipped: the
 *      sink's receiver+method vocabulary (`client`, `fetch`) is the most
 *      generic pairing this registry uses — unlike a SQL handle, an
 *      ordinary HTTP/API client wrapper is routinely named and shaped
 *      exactly like `client.fetch(url)`. Fixed by requiring the query (or
 *      any hop it took to get tainted) to carry recognizable GROQ syntax,
 *      or have been wrapped in the `groq` tag at some point, before
 *      trusting the sink match — a query with no static text anywhere is
 *      never excused by this, since that is the most dangerous shape, not
 *      a safe one.
 *
 * Companion to test.js (pins the true positives) and adversarial.test.js
 * (documents the misses). Anything proposed here has to keep every
 * `invalid` case in both of those files invalid — verified.
 */

const handler = code => `function handler(req, res) { ${code} }`

describe('CLEAN — safe code the rule correctly ignores (regression tests)', () => test('security-no-groq-injection', merge(

  {
    // --- query-fragment composition -----------------------------------
    // The dominant real-world GROQ authoring pattern: shared, statically
    // defined projection fragments composed into a query. A fragment
    // constant is never a registered source, so this stays quiet for the
    // right reason — the same way a static query alongside a tainted one
    // is quiet in no-sql-injection.
    valid: [
      handler('const postFields = groq`{ title, slug }`; readOnlyClient.fetch(groq`*[_type == "post"] { ${postFields} }`)'),
      handler(`
        const authorFields = groq\`{ name, image }\`
        const postFields = groq\`{ title, "author": author->\${authorFields} }\`
        readOnlyClient.fetch(groq\`*[_type == "post"] \${postFields}\`)
      `),
      handler('const fields = field => groq`{ ${field}, _id }`; readOnlyClient.fetch(fields("title"))'),
      handler('const fragments = [groq`title`, groq`slug`].join(", "); readOnlyClient.fetch(groq`*[_type=="post"]{${fragments}}`)'),
      handler('const isPreview = false; const fields = isPreview ? groq`draft` : groq`published`; client.fetch(groq`*[_type=="post"]{${fields}}`)'),
    ],
    invalid: [],
  },

  {
    // --- parameterized calls, every argument shape ----------------------
    // Argument 1 is never inspected, exactly as designed — the same
    // convention every SQL sink already uses.
    valid: [
      handler('const slug = req.query.slug; client.fetch(groq`*[slug.current == $slug]`, { slug })'),
      handler('const slug = req.query.slug; client.fetch(groq`*[slug.current == $slug]`, { slug: slug })'),
      handler('const params = { slug: req.query.slug }; client.fetch(groq`*[slug.current == $slug]`, params)'),
      handler('const args = [groq`*[slug.current == $slug]`, { slug: req.query.slug }]; client.fetch(...args)'),
      handler('client.fetch(groq`*[slug.current == $slug]`, { slug: req.query.slug }, { cache: "no-store" })'),
      `async function handler(req, res) {
         const data = await client.fetch(groq\`*[_type == $type && slug.current == $slug]\`, { type: 'post', slug: req.query.slug })
       }`,
    ],
    invalid: [],
  },

  {
    // --- coercions and allowlists into a groq interpolation -------------
    // The same sanitizer/allowlist proofs no-sql-injection already covers
    // for SQL carry over to the `nosql` kind with nothing kind-specific
    // breaking.
    valid: [
      handler('client.fetch(groq`*[_type == "post"] | order(_createdAt) [0...${Number(req.query.limit)}]`)'),
      handler(`
        const SORT_FIELDS = { newest: '_createdAt desc', oldest: '_createdAt asc' }
        const sort = SORT_FIELDS[req.query.sort] ?? '_createdAt desc'
        client.fetch(groq\`*[_type == "post"] | order(\${sort})\`)
      `),
      handler(`
        const TYPES = ['post', 'page']
        const type = TYPES.includes(req.query.type) ? req.query.type : 'post'
        client.fetch(groq\`*[_type == "\${type}"]\`)
      `),
    ],
    invalid: [],
  },

  {
    // --- lookalikes ------------------------------------------------------
    valid: [
      // Not a Sanity client — the receiver doesn't match the registered set.
      handler('someOtherObject.fetch(groq`*[slug.current == "${req.query.slug}"]`)'),
      // A local `req` that is not an HTTP request object.
      'function build() { const req = { query: "title asc" }; client.fetch(groq`*[_type=="post"] | order(${req.query})`) }',
      // A test double.
      'const client = { fetch: () => Promise.resolve([]) }',
    ],
    invalid: [],
  },
)))

describe('WAS FAILING — confirmed false positives, now fixed', () => test('security-no-groq-injection', merge(
  {
    valid: [
      // `client.fetch(url)` on an ordinary HTTP/API client wrapper — no
      // GROQ syntax anywhere, no groq tag, a correctly percent-encoded
      // value. The single most damaging false positive found: the message
      // asserts a Sanity API the code isn't using.
      handler('const client = getSearchClient(); client.fetch(`https://s.example.com/?q=${encodeURIComponent(req.query.q)}`)'),
      // matchesReceiver matches on the last property name of a
      // MemberExpression, so any object with a `.client` sub-object hit
      // the same collision.
      handler('api.client.fetch(`/users/${req.params.id}`)'),
      // `previewClient` is generic enough to name a non-Sanity preview-API
      // wrapper too.
      handler('previewClient.fetch(`/preview?token=${req.query.token}`)'),
      // The receiver regex is case-insensitive, so a capitalised class
      // static also matched.
      handler('Client.fetch(`/x/${req.query.id}`)'),
    ],
    invalid: [],
  },
)))
