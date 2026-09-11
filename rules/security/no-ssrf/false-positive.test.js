const { describe } = require('node:test')
const { browser } = require('globals')
const { test, merge, asyncHandler: handler } = require('../../../machinery/test')

/**
 * False-positive corpus for `no-ssrf`.
 *
 * Every case in this file is *safe, ordinary, idiomatic* code — none of it
 * is CWE-918. Three parts:
 *
 *   1. CLEAN — the rule is quiet. Regression tests. Includes the three
 *      false-positive families found by the first pass of this corpus and
 *      fixed before ship; each is marked WAS FAILING with what fixed it.
 *   2. CONFIRMED FALSE POSITIVES — still reported today, pinned as
 *      `invalid` with the honest expectation rather than hidden in
 *      `valid` (the convention set by no-client-side-open-redirect's
 *      corpus). Ranked by how common the pattern is in real code.
 *   3. CORRECT, DESPITE LOOKING LIKE A FALSE POSITIVE — code a developer
 *      will read as noise where the report is right. Recorded so the next
 *      reader does not "fix" them.
 *
 * Fixed since the first pass:
 *
 *   (a) A fixed origin with a tainted path or query segment. `authorityIsFixed`
 *       in the rule: a template or `+` chain whose taint all lands after a
 *       literal `/`, `?` or `#` that follows the authority is not this
 *       weakness. `https://${req.query.host}/x` and `${req.query.base}/x`
 *       still report.
 *   (b) `this.http.get(path)` and `services.axios.get(path)` — the rule now
 *       requires a plain-Identifier receiver for the member-rooted sinks.
 *
 *   (c) Browser sources into a fetch. `isServerRequest` drops any flow whose
 *       source id starts with `browser.` — SSRF is a server-side weakness and
 *       those flows belong to security-no-client-side-open-redirect.
 *
 *   (d) `new URL(path, base)` with a literal-prefixed path, and relative
 *       references (`fetch('/api/items/' + id)`), both of which have no
 *       authority an attacker can reach. Second round of the same pass;
 *       their cases are pinned in CLEAN.
 *
 *   (e) The path behind an identifier or a parameter — `${BASE}${path}`,
 *       which every project fetch wrapper writes, where `authorityIsFixed`'s
 *       lexical scan previously saw an opaque hole and assumed the worst.
 *       Fixed by letting an identifier hole be substituted with the
 *       expression it actually holds (`reachableSinksOf`'s new
 *       `callArguments`, same-file one-hop, or a same-file `const`'s own
 *       initializer) and walking that instead of the bare name. Third round;
 *       pinned in CLEAN.
 *
 * What is left in part 2 are the three accepted families below — none of
 * them a lexical-scan limitation, each a deliberate scope boundary (receiver
 * name without module resolution, an allowlist shape the flow analysis
 * cannot follow, a method call assembling the base) recorded so a future
 * pass does not "fix" them into false negatives elsewhere.
 *
 * Companion to test.js (pins the true positives). Everything proposed here
 * has to keep every `invalid` case in that file invalid.
 */

const withBrowser = tests => tests.map(t => ({
  ...(typeof t === 'string' ? { code: t } : t),
  languageOptions: { globals: browser },
}))

describe('CLEAN — safe code the rule correctly ignores (regression tests)', () => test('security-no-ssrf', merge(

  {
    // --- the remediation: a hostname allowlist ---------------------------
    // The rule's message asks for exactly this, so every spelling of it
    // that stays quiet is load-bearing. Re-verified after the guard was
    // tightened to require a provably parsed URL as the receiver: all of
    // them still pass, including the ones that read a property other than
    // .hostname and the ones that request something other than the object
    // that was checked.
    valid: [
      // Guard the parsed object, request the parsed object.
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
        return fetch(target)
      `),
      // Guard the object, request a property of it — the taint is cleared
      // at the receiver, so .href and .toString() inherit the proof.
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
        return fetch(target.href)
      `),
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
        return fetch(target.toString())
      `),
      // .host and .origin, not just .hostname.
      handler(`
        const ALLOWED = ['images.example.com:443']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.host)) return res.status(400).end()
        return fetch(target)
      `),
      handler(`
        const ALLOWED = ['https://images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.origin)) return res.status(400).end()
        return fetch(target)
      `),
      // A Set rather than an array.
      handler(`
        const ALLOWED = new Set(['images.example.com'])
        const target = new URL(req.query.url)
        if (!ALLOWED.has(target.hostname)) return res.status(400).end()
        return fetch(target)
      `),
      // Throwing rather than responding.
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) throw new Error('host not allowed')
        return fetch(target)
      `),
      // A braced consequent whose only statement is the return.
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) { return res.status(400).json({ error: 'host not allowed' }) }
        return fetch(target)
      `),
      // `let` rather than `const`, and an options object at the sink.
      handler(`
        const ALLOWED = ['images.example.com']
        let target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
        return fetch(target, { headers: { 'x-trace': req.id } })
      `),
      // The positive form.
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (ALLOWED.includes(target.hostname)) return fetch(target)
      `),
      // The ternary form.
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        return fetch(ALLOWED.includes(target.hostname) ? target : 'https://images.example.com/placeholder.png')
      `),
      // Checking the raw string through an inline parse.
      handler(`
        const ALLOWED = ['images.example.com']
        if (!ALLOWED.includes(new URL(req.query.url).hostname)) return res.status(400).end()
        return fetch(req.query.url)
      `),
      // The allowlist declared at module scope, which is where it really lives.
      `
        const ALLOWED_HOSTS = ['images.example.com', 'cdn.example.com']
        async function handler(req, res) {
          const target = new URL(req.query.url)
          if (!ALLOWED_HOSTS.includes(target.hostname)) return res.status(400).end()
          return fetch(target)
        }
      `,
      // Guard in the caller, sink in a helper it calls.
      `
        const ALLOWED = ['images.example.com']
        function download(url) { return fetch(url) }
        async function handler(req, res) {
          const target = new URL(req.query.url)
          if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
          return download(target)
        }
      `,
      // Guard inside the helper, taint passed in from the caller — the
      // shape a data-layer module actually has.
      `
        const ALLOWED = ['images.example.com']
        function download(raw) {
          const target = new URL(raw)
          if (!ALLOWED.includes(target.hostname)) throw new Error('host not allowed')
          return fetch(target)
        }
        async function handler(req, res) { return download(req.query.url) }
      `,
    ],
    invalid: [],
  },

  {
    // --- WAS FAILING (a): a fixed origin with a tainted segment ----------
    // The first pass of this corpus pinned every one of these as reported.
    // Fixed by `authorityIsFixed`. This is the most common non-literal
    // request shape in any codebase and it is what the rule's own message
    // recommends, so these are the load-bearing regressions of the whole
    // file: if one of them starts reporting again the rule is telling
    // developers their fix is the bug.
    valid: [
      handler('return fetch(`https://api.example.com/items/${req.params.id}`)'),
      handler('return fetch(`https://api.example.com/search?q=${req.query.q}`)'),
      handler('return fetch(`https://api.example.com/items/${req.params.type}/${req.params.id}`)'),
      handler('return fetch(`https://api.example.com/items/${req.params.id}?full=${req.query.full}`)'),
      // encodeURI rather than encodeURIComponent — correct for a whole
      // URL, not a registered sanitizer, and no longer needing to be one.
      handler('return fetch(`https://api.example.com/search?q=${encodeURI(req.query.q)}`)'),
      handler('return fetch(`https://api.example.com/items/${String(req.params.id)}`)'),
      handler('return fetch(`https://api.example.com/items/${req.params.id.trim()}`)'),
      // Concatenation, and a base held in a const.
      handler("return fetch('https://api.example.com/items/' + req.params.id)"),
      handler(`
        const base = 'https://api.example.com'
        return fetch(base + '/items/' + req.params.id)
      `),
      // The base from env, from config, from a ternary, from a class field.
      handler('return fetch(`${process.env.API_URL}/products/${req.params.slug}`)'),
      `
        import { API_URL } from './config'
        async function handler(req, res) { return fetch(\`\${API_URL}/items/\${req.params.id}\`) }
      `,
      handler("return fetch(`${isDev ? 'http://localhost:3000' : 'https://api.example.com'}/items/${req.params.id}`)"),
      'class Api { constructor() { this.base = process.env.API_URL } get(req) { return fetch(`${this.base}/items/${req.params.id}`) } }',
      // A scheme in a variable with the host still literal.
      handler(`
        const scheme = 'https'
        return fetch(\`\${scheme}://api.example.com/items/\${req.params.id}\`)
      `),
      // An explicit port, and userinfo in the literal — both end the
      // authority the same way a plain host does.
      handler('return fetch(`http://localhost:3000/items/${req.params.id}`)'),
      handler('return fetch(`https://user:pass@api.example.com/items/${req.params.id}`)'),
      // `?` and `#` terminate the authority as well as `/`.
      handler('return fetch(`https://api.example.com?q=${req.query.q}`)'),
      handler('return fetch(`https://api.example.com#${req.query.frag}`)'),
      // A nested template, and the path split across a `+` inside a hole.
      handler('return fetch(`https://api.example.com/${`items/${req.params.id}`}`)'),
      handler(`
        const path = \`items/\${req.params.id}\`
        return fetch(process.env.API_URL + '/' + path)
      `),
      // Every sink family, not just fetch.
      `
        import axios from 'axios'
        async function handler(req) { return axios.get(\`https://api.example.com/items/\${req.params.id}\`) }
      `,
      `
        const https = require('https')
        function handler(req) { return https.get(\`https://api.example.com/items/\${req.params.id}\`) }
      `,
      `
        import got from 'got'
        const BASE = process.env.API_URL
        async function handler(req) { return got(BASE + \`/items/\${req.params.id}\`) }
      `,
      `
        import { request } from 'undici'
        async function handler(req) { return request(\`\${process.env.API_URL}/items/\${req.params.id}\`) }
      `,
      `
        import fetch from 'node-fetch'
        async function handler(req) { return fetch(\`https://api.example.com/items/\${req.params.id}\`) }
      `,
      // Through a same-file helper: the reachable-sinks path applies the
      // same check, with "tainted" meaning "could be the callee's own
      // parameter".
      `
        const BASE = process.env.API_URL
        function api(path) { return fetch(\`\${BASE}/\${path}\`) }
        async function handler(req) { return api(\`items/\${req.params.id}\`) }
      `,
    ],
    invalid: [],
  },

  {
    // --- WAS FAILING (b): a receiver that is not a module namespace ------
    // Matching a sink on the property name alone made every object with a
    // `.get` and a fitting name into node's http module. Fixed for the
    // qualified spellings by requiring a plain-Identifier receiver.
    valid: [
      'class Component { constructor(http) { this.http = http } load(req) { return this.http.get(req.query.url) } }',
      'function handler(req, services) { return services.axios.get(req.query.url) }',
      'function handler(req) { return this.$http.get(req.query.url) }',
    ],
    invalid: [],
  },

  {
    // --- WAS FAILING (c): browser code ------------------------------------
    // CWE-918 is a server-side weakness: the harm is the *server* reaching
    // 169.254.169.254 or a localhost admin port with its own credentials.
    // A fetch in the browser goes out from the user's own machine, subject
    // to CORS, to a host the user already controls. Reporting it printed
    // "makes the server request that URL" over a file with no server in
    // it. Fixed by dropping any flow from a `browser.` source.
    valid: [
      ...withBrowser([
        "function ping() { return fetch(location.origin + '/api/ping') }",
        'function reload() { return fetch(document.location.href) }',
        "const params = new URLSearchParams(location.search); fetch(params.get('url')).then(r => r.json())",
        "function trackReferrer() { return fetch('/api/track?ref=' + encodeURIComponent(document.referrer)) }",
        'function Preview() { const [url, setUrl] = React.useState(""); return <button onClick={() => fetch(url)}>go</button> }',
        'function onSubmit(event) { return fetch(event.target.elements.url.value) }',
      ]),
    ],
    invalid: [],
  },

  {
    // --- sanitized, coerced, validated, or not a string at all -----------
    valid: [
      handler('return fetch(`https://api.example.com/items/${encodeURIComponent(req.params.id)}`)'),
      handler('return fetch(`https://api.example.com/items/${Number(req.params.id)}`)'),
      handler('return fetch(`https://api.example.com/items/${parseInt(req.params.id, 10)}`)'),
      // The idiomatic way to build a query string: URLSearchParams is not
      // a string, and mutating a URL object does not taint it.
      handler(`
        const url = new URL('/search', process.env.API_URL)
        url.searchParams.set('q', req.query.q)
        return fetch(url)
      `),
      handler(`
        const url = new URL('/search', process.env.API_URL)
        url.searchParams.append('q', req.query.q)
        return fetch(url.toString())
      `),
      handler(`
        const url = new URL(process.env.API_URL)
        url.pathname = \`/items/\${req.params.id}\`
        return fetch(url)
      `),
      handler(`
        const params = new URLSearchParams({ q: req.query.q })
        return fetch(\`https://api.example.com/search?\${params}\`)
      `),
      `
        import { z } from 'zod'
        const schema = z.object({ id: z.string().uuid() })
        async function handler(req, res) {
          const { id } = schema.parse(req.params)
          return fetch(\`https://api.example.com/items/\${id}\`)
        }
      `,
      // Kaliber route data and a Next.js server component.
      `
        export async function productDetail({ params }) {
          const response = await fetch(\`\${process.env.API_URL}/products/\${params.slug}\`)
          return response.json()
        }
      `,
      `
        export default async function Page({ searchParams }) {
          const response = await fetch(\`https://api.example.com/search?q=\${encodeURIComponent(searchParams.q)}\`)
          return response.json()
        }
      `,
    ],
    invalid: [],
  },

  {
    // --- an internal service registry ------------------------------------
    // The documented false-positive class from the inventory. A lookup
    // table indexed by request input yields one of its own values, which
    // the analysis already proves for the ORDER BY case in no-sql-injection.
    valid: [
      handler(`
        const SERVICES = { billing: 'https://billing.internal', search: 'https://search.internal' }
        const base = SERVICES[req.query.service] ?? SERVICES.search
        return fetch(\`\${base}/health\`)
      `),
      handler(`
        const SERVICES = new Map([['billing', 'https://billing.internal']])
        const base = SERVICES.get(req.query.service) ?? 'https://search.internal'
        return fetch(base + '/health')
      `),
      handler(`
        const SERVICES = { billing: 'https://billing.internal' }
        const base = SERVICES[req.query.service]
        if (!base) return res.status(404).end()
        return fetch(base + '/health')
      `),
      handler(`
        const SERVICES = ['billing', 'search']
        const service = SERVICES.includes(req.query.service) ? req.query.service : 'search'
        return fetch(\`https://\${service}.internal/health\`)
      `),
      handler(`
        const path = req.query.kind === 'a' ? '/a' : '/b'
        return fetch(process.env.API_URL + path)
      `),
    ],
    invalid: [],
  },

  {
    // --- values that are not request input at all -------------------------
    valid: [
      handler("return fetch('https://api.example.com/items')"),
      handler('return fetch(`${process.env.API_URL}/items`)'),
      handler('return fetch(process.env.WEBHOOK_URL)'),
      // A literal array of feeds, and the same list out of config.
      `
        const FEEDS = ['https://a.example.com/rss', 'https://b.example.com/rss']
        async function handler(req, res) { return Promise.all(FEEDS.map(feed => fetch(feed))) }
      `,
      `
        const { feeds } = require('./config')
        async function handler(req, res) { return Promise.all(feeds.map(feed => fetch(feed))) }
      `,
      // CMS content and a database record. Deliberate URL-fetching
      // features whose URL comes from an editor or a stored subscription,
      // not from this request.
      `
        async function handler(req, res) {
          const page = await client.fetch(query)
          return Promise.all(page.embeds.map(embed => fetch(embed.url)))
        }
      `,
      `
        async function deliver(subscriptionId, payload) {
          const subscription = await db.subscriptions.findById(subscriptionId)
          return fetch(subscription.callbackUrl, { method: 'POST', body: JSON.stringify(payload) })
        }
      `,
      // A seed script and a CLI: process.argv is a source for the shell
      // rules, not for this one.
      `
        const seed = require('./seed.json')
        seed.sources.forEach(source => fetch(source.url))
      `,
      `
        const [, , url] = process.argv
        fetch(url).then(r => r.text()).then(console.log)
      `,
      // Taint in the options object, never in the target.
      handler("return fetch('https://api.example.com/x', { headers: { 'x-user': req.query.id } })"),
      handler("return fetch('https://api.example.com/x', { method: 'POST', body: req.body.raw })"),
    ],
    invalid: [],
  },

  {
    // --- things that are named like a sink but are not one ----------------
    valid: [
      // A Sanity client. Owned by no-groq-injection, and parameterized here.
      handler('return client.fetch(groq`*[_type == $type]`, { type: req.query.type })'),
      // A react-query fetcher and a project fetch wrapper reached through
      // an import — neither is the platform global.
      "import { fetcher } from './machinery/fetcher'; async function handler(req) { return fetcher(req.query.id) }",
      "import fetch from './machinery/fetch'; async function handler(req) { return fetch(req.query.url) }",
      "import { fetch } from '@kaliber/api-client'; async function handler(req) { return fetch(req.query.url) }",
      // Ubiquitous .get methods that are not HTTP.
      handler('return cache.get(req.query.key)'),
      handler('return api.get(req.params.id)'),
      // A named axios instance is a known miss, not a false positive —
      // recorded here so the miss is visible from this side too.
      `
        import axios from 'axios'
        const api = axios.create({ baseURL: process.env.API_URL })
        async function handler(req) { return api.get(\`/items/\${encodeURIComponent(req.params.id)}\`) }
      `,
      // `got` as an ordinary local.
      'function handler(req) { const got = req.query.value; return log(got) }',
      // Sink-shaped text in a comment, a string and a jsdoc block.
      handler('// fetch(req.query.url) would be an SSRF\n    return res.end()'),
      handler("return log('never fetch(req.query.url) here')"),
      `
        /** @example fetch(req.query.url) */
        async function handler(req) { return fetch('https://api.example.com') }
      `,
      // undici's Agent is not one of its request functions.
      `
        import { Agent } from 'undici'
        function handler(req) { return new Agent({ connect: { timeout: req.query.timeout } }) }
      `,
      // A local `req` that is not an HTTP request, and a React `params`
      // prop that is not route params.
      "function build() { const req = { query: { url: 'https://api.example.com' } }; return fetch(req.query.url) }",
      'export function Preview({ params }) { return <a href={params.url}>{params.url}</a> }',
      // Test fixtures.
      `
        const fetch = jest.fn(url => Promise.resolve({ json: () => ({ url }) }))
        test('calls the api', async () => { const req = { query: { url: '/x' } }; await fetch(req.query.url) })
      `,
      `
        jest.mock('node-fetch')
        const fetch = require('node-fetch')
        test('x', () => { const req = { query: { url: '/a' } }; fetch(req.query.url) })
      `,
      "export const Default = { args: { url: 'https://example.com' }, render: ({ url }) => fetch(url) }",
    ],
    invalid: [],
  },
  {
    // --- fixed since the first pass: a URL with no authority to attack ---
    // Both families were pinned as confirmed false positives and are now
    // quiet. `new URL(path, base)` resolves against the base, so the
    // question is only whether `path` can re-host — a literal leading
    // segment says it cannot, and a tainted base is checked separately. A
    // reference beginning with a single `/` has no authority of its own
    // and cannot grow one; the second-character test is what keeps
    // `'//' + host` reported.
    valid: [
      handler('return fetch(new URL(`/items/${req.params.id}`, process.env.API_URL))'),
      handler("return fetch(new URL(`/items/${req.params.id}`, 'https://api.example.com'))"),
      handler('return fetch(new URL(`/items/${req.params.id}`, process.env.API_URL).href)'),
      // A reference beginning with a single `/` — isomorphic and shared
      // code, where the same helper runs against a configured baseURL.
      handler("return fetch('/api/search?q=' + req.query.q)"),
      handler('return fetch(`/api/items/${req.params.id}`)'),
      `
        import axios from 'axios'
        async function handler(req) { return axios.get('/api/items/' + req.params.id) }
      `,
      `
        export function api(path) { return fetch(\`/api\${path}\`) }
        export function getItem(req) { return api(\`/items/\${req.params.id}\`) }
      `,
      // A protocol-relative URL with a *literal* host is equally fixed: the
      // leading `//` opens the authority and the following `/` closes it.
      handler('return fetch(`//api.example.com/items/${req.params.id}`)'),
    ],
    invalid: [],
  },
  {
    // --- fixed since the second pass: the path behind an identifier -------
    // `authorityIsFixed` read one expression lexically, so it could prove
    // `${BASE}/${path}` but not `${BASE}${path}` — the leading `/` was
    // inside the identifier rather than in the template, which is the
    // spelling every project fetch wrapper actually uses. Fixed by letting
    // an identifier hole be substituted with the expression it actually
    // holds — a same-file `const`'s own initializer, or (via
    // `reachableSinksOf`'s new `callArguments`) the concrete argument the
    // one call site this rule can see actually passed — and walking that
    // instead of treating the name as opaque. Still reported, correctly:
    // `api('@evil.com/x')` is exactly what this closed a false positive
    // around without reopening.
    valid: [
      handler(`
        const path = \`/items/\${req.params.id}\`
        return fetch(\`\${process.env.API_URL}\${path}\`)
      `),
      handler(`
        const path = \`/items/\${req.params.id}\`
        return fetch(API_BASE + path)
      `),
      `
        const BASE = process.env.API_URL
        function api(path) { return fetch(\`\${BASE}\${path}\`) }
        async function handler(req) { return api(\`/items/\${req.params.id}\`) }
      `,
      `
        const BASE = process.env.API_URL
        function api(path) { return fetch(BASE + path) }
        async function handler(req) { return api(\`/items/\${req.params.id}\`) }
      `,
    ],
    invalid: [],
  }
)))

describe('CONFIRMED FALSE POSITIVES — reported today, ranked by frequency', () => test('security-no-ssrf', merge(

  {
    // --- 1. A receiver merely *named* http / axios / got -----------------
    // Accepted, per the rule specialist: resolving the receiver to its
    // module needs machinery the engine does not have, and "a matching
    // name plus a tainted argument" is the same bar `sql.query` (`db.query`)
    // and `shell.shelljs.exec` (`sh.exec`) already ship at. The qualified
    // spellings — `this.http`, `services.axios` — are fixed and pinned in
    // CLEAN above; what is left is a local binding whose name is exactly
    // the module's.
    //
    // A consumer turns these off per project without losing the rest of
    // the rule:
    //   settings['@kaliber/security'].registry.disable = ['ssrf.node.http.member']
    valid: [],
    invalid: [
      {
        // The most likely one in a Kaliber project: machinery/http.
        code: `
          import http from './machinery/http'
          async function handler(req) { return http.get(req.params.id) }
        `,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        // An injected dependency destructured to a bare name.
        code: 'function makeService({ http }) { return { load: req => http.get(req.query.url) } }',
        errors: [{ messageId: 'ssrf' }],
      },
      {
        // Test doubles, one per receiver family.
        code: 'const http = { get: url => Promise.resolve({ url }) }; function handler(req) { return http.get(req.query.url) }',
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: 'const axios = { get: async url => ({ data: { url } }) }; async function handler(req) { return axios.get(req.query.url) }',
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: 'function handler(req) { const got = { get: k => k }; return got.get(req.query.url) }',
        errors: [{ messageId: 'ssrf' }],
      },
    ],
  },

  {
    // --- 2. Allowlist guards the flow analysis cannot prove --------------
    // Unchanged by this round. Lower frequency than 1-2 individually, but
    // this is the point of the rule: the developer did the right thing and
    // still gets told to do the right thing. Every one of these has a
    // spelling that works (all in CLEAN above), so the workaround is
    // "write it the other way" rather than a suppression — acceptable to
    // ship only if the docs list the proven spellings, which they do not
    // yet.
    valid: [],
    invalid: [
      {
        // A braced consequent that does anything before returning — the
        // most common Express spelling of an early return. Narrowing:
        // isAbruptConsequent should accept a block whose *last* statement
        // is a return or throw, not one whose every statement is.
        code: handler(`
          const ALLOWED = ['images.example.com']
          const target = new URL(req.query.url)
          if (!ALLOWED.includes(target.hostname)) { res.status(400); return }
          return fetch(target)
        `),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // One allowed host, so nobody writes an array. Narrowing: treat
        // `x.hostname !== 'literal'` / `=== 'literal'` as membership over
        // a one-element collection, reusing hostCheckTarget on the left.
        code: handler(`
          const target = new URL(req.query.url)
          if (target.hostname !== 'images.example.com') return res.status(400).end()
          return fetch(target)
        `),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // The allowlist imported from config, which is where a real one
        // lives. Not fixable by folding — the value is in another file —
        // but an imported binding is not attacker-controlled, which is the
        // only property isPrimitiveCollection is really asserting.
        code: `
          import { ALLOWED_HOSTS } from './config'
          async function handler(req, res) {
            const target = new URL(req.query.url)
            if (!ALLOWED_HOSTS.includes(target.hostname)) return res.status(400).end()
            return fetch(target)
          }
        `,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // The same list out of the environment. Same proposed narrowing:
        // process.env is trusted everywhere else in this registry.
        code: handler(`
          const ALLOWED = process.env.ALLOWED_HOSTS.split(',')
          const target = new URL(req.query.url)
          if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
          return fetch(target)
        `),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // The check extracted to a predicate, which is what happens the
        // second time it is needed. Guards deliberately do not cross a
        // function boundary; the same-file helper summaries that power
        // reportReachableSinks are where this would be lifted.
        code: handler(`
          const ALLOWED = ['images.example.com']
          const isAllowed = url => ALLOWED.includes(url.hostname)
          const target = new URL(req.query.url)
          if (!isAllowed(target)) return res.status(400).end()
          return fetch(target)
        `),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // The host hoisted into its own const before the check — textual
        // identity fails because the guard names `hostname` and the sink
        // names `target`.
        code: handler(`
          const ALLOWED = ['images.example.com']
          const target = new URL(req.query.url)
          const hostname = target.hostname
          if (!ALLOWED.includes(hostname)) return res.status(400).end()
          return fetch(target)
        `),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // Destructured out of the parse, then the original string is
        // requested. Same failure, one hop further.
        code: handler(`
          const ALLOWED = ['images.example.com']
          const { hostname } = new URL(req.query.url)
          if (!ALLOWED.includes(hostname)) return res.status(400).end()
          return fetch(req.query.url)
        `),
        errors: [{ messageId: 'ssrf' }],
      },
    ],
  },

  {
    // --- 3. A fixed base assembled by a method call ----------------------
    // urlParts reads templates, `+` chains and string literals. A URL put
    // together with `.concat()` or a placeholder `.replace()` is invisible
    // to it and falls back to reporting. Low frequency — `.replace(':id',
    // value)` on a route template is the only one seen in the wild — and
    // the workaround is to write the template, which is better code
    // anyway. Listed so the ceiling of the lexical scan is on the record.
    valid: [],
    invalid: [
      {
        code: handler("return fetch('https://api.example.com/items/'.concat(req.params.id))"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler("return fetch('https://api.example.com/items/:id'.replace(':id', req.params.id))"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },
)))

describe('CORRECT — reports that read as noise but are not', () => test('security-no-ssrf', merge(

  {
    valid: [],
    invalid: [
      {
        // `new URL(untrusted, FIXED_BASE)` looks like the safe pattern and
        // is not: `new URL('//evil.com', 'https://api.example.com')`
        // resolves to https://evil.com, and so does any absolute URL in
        // the first argument. hostCheckTarget already refuses to prove a
        // two-argument URL for the same reason. Contrast with family 2
        // above, where the first argument has a literal leading segment.
        code: handler(`
          const target = new URL(req.query.path, 'https://api.example.com')
          return fetch(target)
        `),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // A literal origin with no terminator before the taint. Reads as a
        // fixed origin and is not one: `'https://api.example.com' + '@evil.com/x'`
        // has authority evil.com. This is why authorityIsFixed insists on
        // seeing the `/`.
        code: handler("return fetch('https://api.example.com' + req.query.suffix)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // Building an absolute self-URL from the Host header. The header is
        // attacker-controlled unless a proxy pins it, and this is the
        // textbook Host-header SSRF.
        code: handler('return fetch(`https://${req.headers.host}/api/products`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // A project fetch wrapper declared *in this file* that forwards to
        // the real global. The registry note says a locally bound `fetch`
        // does not match, and the direct sink indeed does not — but the
        // interprocedural pass follows the wrapper to the real fetch
        // inside it, which is right: the request does happen.
        code: `
          function fetch(url, options) { return globalThis.fetch(url, { ...options, headers: authHeaders() }) }
          async function handler(req) { return fetch(req.query.url) }
        `,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // Deliberate URL-fetching features — link preview, image proxy.
        // The inventory files these under false positives; they are not.
        // The code really does request an attacker-chosen host and the
        // mitigation (a host allowlist, blocking redirects, blocking
        // link-local ranges) is absent. A consumer who has accepted the
        // risk suppresses it with
        // `// eslint-disable-next-line @kaliber/security-no-ssrf` and a
        // reason, at the one or two call sites a product has — not with a
        // rule-level exemption.
        code: handler("const response = await fetch(req.body.url, { redirect: 'manual' }); return res.json({ ok: response.ok })"),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler('const upstream = await fetch(req.query.src); return upstream.body.pipe(res)'),
        errors: [{ messageId: 'ssrf' }],
      },
    ],
  },
)))
