const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-ssrf.
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
 * THREE SOUNDNESS BUGS FOUND HERE ARE NOW FIXED. Their cases moved from `valid`
 * to `invalid` and are load-bearing regression tests:
 *
 *   1. hostCheckTarget() accepted *any* member expression whose property is
 *      `hostname`/`host`/`origin`, so a membership check on one property of a
 *      request object cleared the whole object — and every sibling read
 *      through it. `if (!ALLOWED.includes(q.host)) return` silenced
 *      `fetch(q.url)`, and (guards clear every kind at once) `db.query('… ' +
 *      q.name)` in the same function. Fixed by requiring the object to be a
 *      provable parsed URL: an inline one-argument `new URL(x)` or an
 *      identifier whose single definition initialises it from one.
 *
 *   2. matchesModuleSink() had no default-specifier branch, so it fell back
 *      to the *local* name — `import fetch from 'node-fetch'` matched only by
 *      coincidence of what the developer called it, and `import f from
 *      'node-fetch'` / `import ax from 'axios'` were invisible. Fixed by
 *      testing the pattern against the export's real name, `default`, which
 *      every one of these registry entries already writes.
 *
 * ---------------------------------------------------------------------------
 *
 *   3. authorityIsFixed() set `base` true on *any* untainted interpolation,
 *      after which the first literal `/` in later static text closed the
 *      authority — so a scheme held in a variable put that `/` between the
 *      untrusted host and any proof that a host was ever established:
 *
 *        const proto = req.secure ? 'https:' : 'http:'
 *        fetch(`${proto}//${req.query.host}/x`)     // was unreported
 *
 *      The `//` was read as the end of an authority that was never begun,
 *      and choosing a scheme from `req.secure` / `x-forwarded-proto` is
 *      ordinary behind a proxy. Fixed: a leading `//` in static text now
 *      opens an authority rather than closing one. The inline spelling
 *      `${scheme}://${host}/x` was already defended by the `://` check.
 *
 * Still a miss, same mechanism without an exploit:
 * `${untaintedHole}/${req.query.host}` reads as fixed with no scheme
 * anywhere, which produces a relative URL.
 *
 * ---------------------------------------------------------------------------
 *
 * The highest-impact plain false negatives, in order of how likely a real
 * developer is to write the shape:
 *
 *   1. `const fetch = require('node-fetch')`. Already recorded on the sink
 *      entry as a known gap, but it deserves its ranking: it is *the* way
 *      node-fetch is used in every CommonJS codebase, and the whole sink
 *      family is invisible in that spelling. (The `import f from 'node-fetch'`
 *      half of this is now fixed — see above.)
 *
 *   2. Framework request objects that are not Express. Next.js route handlers
 *      and page props, Koa's `ctx`, and Lambda's `event` are all unregistered
 *      sources, and an SSRF-shaped feature (image proxy, link preview,
 *      webhook relay) is written in one of those at least as often as in an
 *      Express handler. Inherited from the source registry.
 *
 *   3. A default-exported fetch helper (`import api from './api'`). Named
 *      cross-file exports resolve; the default export does not, and a
 *      one-function data-layer module is nearly always a default export.
 *
 *   4. `ax.get(url)` after `import ax from 'axios'`. The bare-call half is
 *      fixed; the member half still goes through the receiver-pinned entry,
 *      which matches on the local name.
 *
 * Observed false positives, left unasserted on purpose so a future fix is not
 * a test failure:
 *
 *   - a correct guard whose allowlist is imported (`import { ALLOWED } from
 *     './hosts'`) — getStaticValue cannot fold across files, so the guard is
 *     not proven and the safe code is reported;
 *   - a correct guard followed by a use inside a nested callback
 *     (`setTimeout(() => fetch(t))`) — guards deliberately do not cross a
 *     function boundary, and the callback is inside one;
 *   - a fixed origin whose path is appended with `String#concat` rather than
 *     `+` or a template — `'https://api.example.com/items/'.concat(id)`.
 *     urlParts() flattens templates and `+` chains only, so authorityIsFixed
 *     never gets a parts list and the safe call is reported.
 */

const handler = code => `function handler(req, res) { ${code} }`
const ALLOWED = "const ALLOWED = ['images.example.com']\n"
const FIXTURES = `${__dirname}/../../../machinery/security/fixtures/interprocedural/src`

test('security-no-ssrf', merge(
  {
    // --- the host-allowlist flow guard -------------------------------------
    //
    // The new capability: a membership check against a *host* clears the flow.
    // Attacking it means finding a check that clears taint without proving
    // anything about where the request lands.
    valid: [
      // SAFE — the documented remediation, in the spellings that must stay
      // quiet. Both objects (`t.hostname`) and raw strings
      // (`new URL(s).hostname`), all three host properties, the positive-if
      // and ternary forms, `throw` instead of `return`, a Set, an inline array
      // literal, a frozen array, and a computed `includes`.
      handler(ALLOWED + `const t = new URL(req.query.url); if (!ALLOWED.includes(t.host)) return res.status(400).end(); fetch(t)`),
      handler(ALLOWED + `const t = new URL(req.query.url); if (!ALLOWED.includes(t.origin)) return res.status(400).end(); fetch(t)`),
      handler(ALLOWED + `const t = new URL(req.query.url); if (ALLOWED.includes(t.hostname)) { fetch(t) }`),
      handler(ALLOWED + `const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) throw new Error('host not allowed'); fetch(t)`),
      handler(ALLOWED + `const u = ALLOWED.includes(new URL(req.query.url).hostname) ? req.query.url : 'https://images.example.com'; fetch(u)`),
      handler(`const ALLOWED = new Set(['images.example.com']); const t = new URL(req.query.url); if (!ALLOWED.has(t.hostname)) return res.status(400).end(); fetch(t)`),
      handler(`const t = new URL(req.query.url); if (!['images.example.com'].includes(t.hostname)) return res.status(400).end(); fetch(t)`),
      handler(`const ALLOWED = Object.freeze(['images.example.com']); const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
      handler(ALLOWED + `const m = 'includes'; const t = new URL(req.query.url); if (!ALLOWED[m](t.hostname)) return res.status(400).end(); fetch(t)`),
      handler(ALLOWED + `if (!ALLOWED.includes(new URL(req.query.url).hostname)) return res.status(400).end(); fetch(new URL(req.query.url))`),
      // SAFE, and the asymmetry is deliberate: for a *binding* the two-argument
      // form clears, because the thing proven and the thing requested are the
      // same parsed object. It is only the inline form that must refuse two
      // arguments — there the proof would be transferred to the raw input
      // string, which `//evil.com` detaches from the base.
      handler(ALLOWED + `const t = new URL(req.query.url, BASE); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),

      // ADVERSARIAL MISS: the guard is positional (it scans preceding
      // statements in the block) and matches on identifier text, so a
      // *reassignment after* the guard inherits the proof. The redirect-
      // following shape — validate the first hop, then follow the Location
      // header — is exactly this. Pre-existing: the original
      // `TABLES.includes(t)` guard has the same hole, so it is not the host
      // capability's to fix.
      handler(ALLOWED + `let t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); t = new URL(req.query.next); fetch(t)`),
      // ADVERSARIAL MISS, the same flow-insensitivity from the other side: the
      // binding is reassigned *before* the guard, so what gets checked is not
      // a parsed URL any more. isUrlBinding looks at the single definition,
      // not at which write reaches the check. Recorded rather than escalated
      // because it is not exploitable in this spelling — at runtime
      // `t.hostname` is undefined and the guard rejects everything.
      handler(ALLOWED + `let t = new URL(req.query.a); t = req.query.u; if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
    ],
    invalid: [
      // FIXED BUG #1 — regression tests, do not loosen. A membership check on
      // `.host`/`.hostname`/`.origin` used to clear the *object* it was read
      // from, and with it every sibling property. `?host=images.example.com
      // &url=http://169.254.169.254/` walked straight through. The object must
      // be a provable parsed URL for the check to prove anything.
      {
        code: handler(ALLOWED + `const q = req.query; if (!ALLOWED.includes(q.host)) return res.status(400).end(); fetch(q.url)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(ALLOWED + `const q = req.query; if (!ALLOWED.includes(q.hostname)) return res.status(400).end(); fetch(q.url)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(ALLOWED + `const body = req.body; if (!ALLOWED.includes(body.origin)) return res.status(400).end(); fetch(body.webhookUrl)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The same bug in its two most plausible sets of clothes: a CORS-style
      // origin check on the request headers, and an image proxy that
      // allowlists `?host=` and then splices in an unchecked `?path=` — where
      // `path=@evil.com/x` produces `https://images.example.com@evil.com/x`
      // and the request goes to evil.com.
      {
        code: handler(ALLOWED + `const hdr = req.headers; if (!ALLOWED.includes(hdr.origin)) return res.status(403).end(); fetch(hdr['x-target-url'])`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(ALLOWED + `const p = req.query; if (!ALLOWED.includes(p.host)) return res.status(400).end(); fetch(\`https://\${p.host}\${p.path}\`)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The fix's own boundary: a `var` redeclared over the URL binding gives
      // the variable two definitions, so nothing is provable and the check
      // does not clear. Same for a binding that is assigned rather than
      // initialised, and for a parameter defaulted to a parsed URL.
      {
        code: handler(ALLOWED + `var t = new URL(req.query.a); var t = req.query.u; if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(ALLOWED + `let t; t = new URL(req.query.u); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: ALLOWED + `function handler(req, res, t = new URL(req.query.u)) { if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // `new URL(input, base).hostname` proves nothing about `input`:
      // `?url=//evil.com` resolves to evil.com. The two-argument form must not
      // clear, and it does not — both when the base is a literal and when it
      // is a variable, and both when the parse is inline and when it is bound.
      {
        code: handler(ALLOWED + `if (!ALLOWED.includes(new URL(req.query.url, 'https://images.example.com').hostname)) return res.status(400).end(); fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(ALLOWED + `const t = new URL(req.query.url, BASE); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      // A check on a different variable than the one requested.
      {
        code: handler(ALLOWED + `const safe = new URL('https://images.example.com'); if (!ALLOWED.includes(safe.hostname)) return res.status(400).end(); fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(ALLOWED + `const a = new URL(req.query.a); const b = new URL(req.query.b); if (!ALLOWED.includes(a.hostname)) return res.status(400).end(); fetch(b)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A check on a property that is not a host at all.
      {
        code: handler(ALLOWED + `const t = new URL(req.query.url); if (!ALLOWED.includes(t.pathname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(ALLOWED + `const q = req.query; if (!ALLOWED.includes(q.slug)) return res.status(400).end(); fetch(q.url)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The host is checked, a *different* request property is fetched.
      {
        code: handler(ALLOWED + `if (!ALLOWED.includes(req.headers.origin)) return res.status(403).end(); fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(ALLOWED + `const t = req.query; if (!ALLOWED.includes(new URL(t.url).hostname)) return res.status(400).end(); fetch(t.other)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // An allowlist that is not a foldable literal collection: computed at
      // runtime from the environment, empty, or not a collection at all.
      {
        code: handler(`const ALLOWED = process.env.HOSTS.split(','); const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`const ALLOWED = []; const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`const ALLOWED = { 'images.example.com': 1 }; const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A *string* allowlist. `.includes` on a string is a substring test, so
      // the parent domain `example.com` would pass a list meant to hold two
      // subdomains. Not a proof, and correctly not treated as one.
      {
        code: handler(`const ALLOWED = 'images.example.com,cdn.example.com'; const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A suffix check rather than a membership check — `example.com.evil.tld`
      // and `notexample.com` both pass these.
      {
        code: handler(`const t = new URL(req.query.url); if (!t.hostname.includes('example.com')) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`const t = new URL(req.query.url); if (!/example\\.com$/.test(t.hostname)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The guard lives in another function. Neither the predicate-returning
      // form nor the guard-clause-in-a-helper form clears, and neither should:
      // nothing links the callee's return value to control flow here.
      {
        code: ALLOWED + `function check(u) { return ALLOWED.includes(new URL(u).hostname) }
               function handler(req, res) { if (!check(req.query.url)) return res.status(400).end(); fetch(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: ALLOWED + `function guard(req, res) { if (!ALLOWED.includes(new URL(req.query.url).hostname)) return res.status(400).end() }
               function handler(req, res) { guard(req, res); fetch(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      // Guard shapes that prove nothing: the else branch, and an `if` whose
      // body is not abrupt.
      {
        code: handler(ALLOWED + `const t = new URL(req.query.url); if (ALLOWED.includes(t.hostname)) { log() } else { fetch(t) }`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(ALLOWED + `const t = new URL(req.query.url); if (!ALLOWED.includes(t.hostname)) { console.log('bad') } fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The host read into a local first: `hn` is what was checked, `t` is
      // what is requested, and textual identity refuses the leap.
      {
        code: handler(ALLOWED + `const t = new URL(req.query.url); const hn = t.hostname; if (!ALLOWED.includes(hn)) return res.status(400).end(); fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The allowlist shadowed by an inner block: the guard is in that block,
      // the fetch is outside it.
      {
        code: handler(`const t = new URL(req.query.url); { const ALLOWED = ['images.example.com']; if (!ALLOWED.includes(t.hostname)) return res.status(400).end() } fetch(t)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // `continue` is not an abrupt consequent the guard recognises, so the
      // loop-with-guard form is still reported. A false positive rather than a
      // miss, recorded here because it is the shape a batch fetcher takes.
      {
        code: handler(ALLOWED + `for (const raw of req.body.urls) { const t = new URL(raw); if (!ALLOWED.includes(t.hostname)) continue; fetch(t) }`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The ternary form of the bug's shape. Bound before the guard rather
      // than after, so nothing is proven and it is reported — the tell that
      // the miss above is positional.
      {
        code: handler(ALLOWED + `const q = req.query; const u = q.url; if (!ALLOWED.includes(q.host)) return res.status(400).end(); fetch(u)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },

  {
    // --- value flow into argument 0 ----------------------------------------
    valid: [
      // ADVERSARIAL MISS: containers. An object property round-trip, an array
      // element, Object.assign, a getter, and Array#join. All inherited walls
      // (limitation 2), all trivially reachable here — `const opts = { url:
      // req.query.url }` is how an options object gets built.
      handler(`const o = { u: req.query.url }; fetch(o.u)`),
      handler(`const a = [req.query.url]; fetch(a[0])`),
      handler(`const o = Object.assign({}, req.query); fetch(o.url)`),
      handler(`const o = { get u() { return req.query.url } }; fetch(o.u)`),
      handler(`fetch(['https://', req.query.host].join(''))`),
      // ADVERSARIAL MISS: class instance state (limitation 6). A service class
      // holding the target on `this` is an ordinary shape.
      `class Proxy { constructor(req) { this.url = req.query.url } run() { return fetch(this.url) } }`,
      // ADVERSARIAL MISS: unknown calls (limitation 3) — an IIFE, a promise
      // chain, and an awaited promise.
      handler(`fetch((() => req.query.url)())`),
      handler(`Promise.resolve(req.query.url).then(u => fetch(u))`),
      `async function handler(req) { const u = await Promise.resolve(req.query.url); fetch(u) }`,
      // ADVERSARIAL MISS: String.raw is plain string building with no
      // escaping, and an unrecognised tag is a wall.
      handler('fetch(String.raw`https://${req.query.host}/x`)'),
      // ADVERSARIAL MISS: a spread argument never binds to argument 0.
      handler(`const args = [req.query.url]; fetch(...args)`),

      // SAFE — encodeURIComponent clears the `url` kind, and correctly: a
      // percent-encoded whole URL is not a URL any more, and an encoded
      // segment cannot break out of a fixed origin.
      handler(`fetch(\`https://\${encodeURIComponent(req.query.host)}.cdn.example.com/x\`)`),
      handler(`fetch(\`https://api.example.com/items/\${encodeURIComponent(req.params.id)}\`)`),
    ],
    invalid: [
      // Aliasing and reassignment.
      {
        code: handler(`const q = req.query; fetch(q.url)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`const a = req.query.url; const b = a; const c = b; fetch(c)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`let u = 'https://api.example.com'; u = req.query.url; fetch(u)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Destructuring: flat, nested, renamed with a default, and rest.
      {
        code: handler(`const { url } = req.query; fetch(url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`const { query: { url } } = req; fetch(url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`const { query: { url: u = '' } } = req; fetch(u)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`const { a, ...rest } = req.query; fetch(rest.url)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Computed member access, literal and folded.
      {
        code: handler(`fetch(req['query']['url'])`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`const k = 'url'; fetch(req.query[k])`),
        errors: [{ messageId: 'ssrf' }],
      },
      // String building: template, template nested in template, concat via
      // String#concat, and += accumulation. The protocol-relative payload
      // (`//evil.com/x`) is the one that matters most — it inherits the
      // scheme and is not obviously an absolute URL to a reviewer.
      {
        code: handler('fetch(`${req.query.url}`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler('fetch(`${`${req.query.url}`}`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch('//' + req.query.host + '/x')`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch('https://'.concat(req.query.host))`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`let u = 'https://'; u += req.query.host; fetch(u)`),
        errors: [{ messageId: 'ssrf' }],
      },
      // Laundering through string methods that change nothing about the host.
      {
        code: handler(`fetch(req.query.url.replace(/\\s/g, ''))`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch(req.query.url.trim())`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch(String(req.query.url))`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch(decodeURIComponent(req.query.url))`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Conditional and logical fallbacks.
      {
        code: handler(`fetch(req.query.url ? req.query.url : 'https://api.example.com')`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch(req.query.url ?? 'https://api.example.com')`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch(req.query.url || 'https://api.example.com')`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Comma operator, a loop over a tainted array, a multi-write through
      // try/catch, and await at the call.
      {
        code: handler(`fetch((0, req.query.url))`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`for (const u of req.body.urls) { fetch(u) }`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`let u = 'https://api.example.com'; try { u = req.query.url } catch (e) {} fetch(u)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `async function handler(req) { await fetch(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      // A tainted URL object. `new URL(tainted)` is still attacker-controlled,
      // and `new URL(tainted, base)` is too — `//evil.com` ignores the base.
      {
        code: handler(`fetch(new URL(req.query.url))`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler(`fetch(new URL(req.query.path, 'https://api.example.com'))`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },

  {
    // --- sink and callee resolution ----------------------------------------
    valid: [
      // ADVERSARIAL MISS, and the worst plain false negative here: the whole
      // module bound by require. Recorded on the sink entry as a known gap;
      // it is also the dominant node-fetch spelling in CommonJS.
      `const fetch = require('node-fetch')
       function handler(req) { fetch(req.query.url) }`,
      // ADVERSARIAL MISS, the surviving half of fixed bug #2: a renamed
      // default import reached through a *member*. The bare call is fixed
      // (see the invalid block), but `ax.get(...)` is matched by the
      // receiver-pinned `ssrf.axios.member` entry, which compares the local
      // name against /^axios$/i and knows nothing about where `ax` came from.
      `import ax from 'axios'
       function handler(req) { ax.get(req.query.url) }`,
      // ADVERSARIAL MISS: a dynamic import of the same module.
      `async function handler(req) { const { default: f } = await import('node-fetch'); f(req.query.url) }`,

      // ADVERSARIAL MISS: instances. `axios.create()` and `got.extend()` are
      // the recommended way to configure a client, and the receiver is pinned
      // to the bare package name. Documented on the sink entries, with
      // per-project sink registration as the escape hatch.
      `import axios from 'axios'
       const api = axios.create({ baseURL: 'https://api.example.com' })
       function handler(req) { api.get(req.query.url) }`,
      `import got from 'got'
       const api = got.extend({ prefixUrl: 'https://api.example.com' })
       function handler(req) { api(req.query.url) }`,

      // ADVERSARIAL MISS: the config-object call forms. An object literal
      // carries no taint at the argument position, so both are invisible.
      // Documented; `http.get({ host, path })` in particular is the classic
      // node http spelling and reaches exactly the same network.
      `import axios from 'axios'
       function handler(req) { axios({ url: req.query.url }) }`,
      `const http = require('http')
       function handler(req) { http.get({ host: req.query.host, path: '/' }) }`,
      // ADVERSARIAL MISS: undici's Client/Agent constructors take an origin
      // and are not registered.
      `import { Client } from 'undici'
       function handler(req) { new Client(req.query.url) }`,

      // ADVERSARIAL MISS: the global rebound to a local before use, and the
      // indirect-call spellings sinkAt rejects because the callee is not a
      // plain Identifier or MemberExpression.
      handler(`const f = fetch; f(req.query.url)`),
      handler(`const { fetch: f } = globalThis; f(req.query.url)`),
      handler(`(0, fetch)(req.query.url)`),
      handler(`fetch.call(null, req.query.url)`),

      // DELIBERATE MISS, documented on the sink entry: a Request object is
      // not a string this analysis taints. Kept here so the decision stays
      // visible next to the evasions that are not deliberate.
      handler(`fetch(new Request(req.query.url))`),

      // SAFE — a local `fetch` is not the platform global.
      `const fetch = require('./our-fetch')
       function handler(req) { fetch(req.query.url) }`,
    ],
    invalid: [
      // FIXED BUG #2 — regression tests. A renamed default import used to be
      // invisible because matchesModuleSink fell back to the local name;
      // matching the export's real name (`default`) is what makes the
      // `default` already written in these registry entries mean anything.
      {
        code: `import f from 'node-fetch'
               function handler(req) { f(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `import ax from 'axios'
               function handler(req) { ax(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      // The global through each of its objects, optionally called, and via a
      // folded computed method name.
      {
        code: handler(`globalThis.fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`self.fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`globalThis.fetch?.(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`const m = 'fetch'; globalThis[m](req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      // The bare global in an exported arrow — not inside a `function
      // handler`, and the sink does not care.
      {
        code: `export const handler = req => fetch(req.query.url)`,
        errors: [{ messageId: 'ssrf' }],
      },
      // axios: the named-export method, the namespace import, the require
      // binding, and with a trailing config object.
      {
        code: `import { request } from 'axios'
               function handler(req) { request(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `import * as axios from 'axios'
               function handler(req) { axios.get(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `const axios = require('axios')
               function handler(req) { axios.get(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `import axios from 'axios'
               function handler(req) { axios.get(req.query.url, { timeout: 1000 }) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      // The fetch polyfills, node http/https through every binding shape, got
      // and undici through a member.
      {
        code: `import fetch from 'cross-fetch'
               function handler(req) { fetch(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `const https = require('https')
               function handler(req) { https.request(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `import { get } from 'http'
               function handler(req) { get(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `const http = require('node:http')
               function handler(req) { http.get(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `import got from 'got'
               function handler(req) { got.get(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `const undici = require('undici')
               function handler(req) { undici.request(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: `import { fetch } from 'undici'
               function handler(req) { fetch(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
    ],
  },

  {
    // --- delegation: the sink lives behind a helper -------------------------
    valid: [
      // ADVERSARIAL MISS: the target arrives through a callback rather than a
      // parameter of the function that holds the sink.
      `function withUrl(u, cb) { return cb(u) }
       function handler(req) { withUrl(req.query.url, u => fetch(u)) }`,
      // ADVERSARIAL MISS: a rest parameter (named as unbound in bindParam),
      // and a curried factory whose sink is inside a returned closure.
      `function get(...args) { return fetch(args[0]) }
       function handler(req) { get(req.query.url) }`,
      `const get = (base => u => fetch(u))('https://api.example.com')
       function handler(req) { get(req.query.url) }`,
      // ADVERSARIAL MISS: a static class method, and an instance method called
      // through `this` — the shape a service class uses to hold its own
      // fetcher.
      `class Api { static get(u) { return fetch(u) } }
       function handler(req) { Api.get(req.query.url) }`,
      `class Api { go(u) { return fetch(u) } run(req) { return this.go(req.query.url) } }`,

      // ADVERSARIAL MISS: cross-file callee shapes that resolveExport does not
      // follow. The default export is the worst of these — a module whose one
      // job is "fetch a thing" is nearly always a default export. The barrel
      // and namespace misses are inherited from no-sql-injection's corpus and
      // repeated here only because a data-layer barrel is how these helpers
      // are actually imported.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import proxy from './ssrfHelpers'
               function handler(req) { proxy(req.query.url) }`,
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { fetchUrl } from './ssrfBarrel'
               function handler(req) { fetchUrl(req.query.url) }`,
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import * as helpers from './ssrfHelpers'
               function handler(req) { helpers.fetchUrl(req.query.url) }`,
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { client } from './ssrfHelpers'
               function handler(req) { client.get(req.query.url) }`,
      },

      // SAFE — the helper is reached with a literal.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { fetchUrl } from './ssrfHelpers'
               function handler(req) { fetchUrl('https://api.example.com/health') }`,
      },
    ],
    invalid: [
      // Same-file: arrow const, object method, async, a defaulted parameter, a
      // destructured parameter, argument 1 rather than 0, and a helper that
      // builds the URL from a host it was handed.
      {
        code: `const get = u => fetch(u)
               function handler(req) { get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `export const api = { get(u) { return fetch(u) } }
               function handler(req) { api.get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `async function get(u) { return fetch(u) }
               async function handler(req) { await get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function get(u = 'https://api.example.com') { return fetch(u) }
               function handler(req) { get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function get({ url }) { return fetch(url) }
               function handler(req) { get({ url: req.query.url }) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function get(opts, u) { return fetch(u) }
               function handler(req) { get({}, req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: 'function get(host) { return fetch(`https://${host}/v1/items`) }\nfunction handler(req) { get(req.query.host) }',
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Two and three hops, a recursive helper, a hoisted declaration used
      // before it is defined, a promise chain inside the helper, and the
      // module.exports round-trip.
      {
        code: `function get(u) { return fetch(u) }
               function mid(u) { return get(u) }
               function handler(req) { mid(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function a(u) { return fetch(u) }
               function b(u) { return a(u) }
               function c(u) { return b(u) }
               function handler(req) { c(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function get(u, n) { return n ? get(u, n - 1) : fetch(u) }
               function handler(req) { get(req.query.url, 2) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function handler(req) { get(req.query.url) }
               function get(u) { return fetch(u) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function get(u) { return fetch(u).then(r => r.json()) }
               function handler(req) { return get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `module.exports = { get }
               function get(u) { return fetch(u) }
               function handler(req) { get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `function get(u) { return fetch(u) }
               function handler(req) { get?.(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Helpers holding a non-fetch sink.
      {
        code: `function get(u) { return axios.get(u) }
               function handler(req) { get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `const http = require('http')
               function get(u) { return http.get(u) }
               function handler(req) { get(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Cross-file, one hop: the named export, a renamed import of it, the
      // require spelling, a helper that builds the URL from a host, and a
      // local wrapper in front of the imported helper.
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { fetchUrl } from './ssrfHelpers'
               function handler(req) { fetchUrl(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { fetchUrl as go } from './ssrfHelpers'
               function handler(req) { go(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `const { fetchUrl } = require('./ssrfHelpers')
               function handler(req) { fetchUrl(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { fetchFromHost } from './ssrfHelpers'
               function handler(req) { fetchFromHost(req.query.host) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        filename: `${FIXTURES}/caller.js`,
        code: `import { fetchUrl } from './ssrfHelpers'
               function mid(u) { return fetchUrl(u) }
               function handler(req) { mid(req.query.url) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },

  {
    // --- source reach -------------------------------------------------------
    valid: [
      // ADVERSARIAL MISS: a destructured handler parameter (limitation 4).
      `function handler({ query }, res) { fetch(query.url) }`,
      // ADVERSARIAL MISS: every non-Express request object. Next.js route
      // handlers and page props, Koa's ctx, Lambda's event. An SSRF-shaped
      // feature is written against one of these at least as often as against
      // Express, so this is the second-biggest gap in the rule.
      `export default async function Page({ searchParams }) { return fetch(searchParams.url) }`,
      `async function proxy(ctx) { ctx.body = await fetch(ctx.query.url) }`,
      `exports.handler = async event => fetch(event.queryStringParameters.url)`,

      // SAFE — the inner `req` shadows the parameter and is a local object.
      handler(`{ const req = { query: { url: 'https://api.example.com' } }; fetch(req.query.url) }`),

      // DELIBERATE, and correct: a `browser.` source is never this weakness.
      // The request is made by the user's own browser, cross-origin, subject
      // to CORS and carrying no server-side trust — there is no server in the
      // file to turn into a proxy. The navigation flows that *are* a weakness
      // belong to security-no-client-side-open-redirect.
      `fetch(location.search)`,
      `fetch(document.referrer)`,
      `fetch(window.name)`,
      `fetch(new URLSearchParams(location.search).get('u'))`,
      `import axios from 'axios'
       axios.get(location.hash.slice(1))`,

      // ADVERSARIAL MISS, and the cost of that decision: isServerRequest()
      // inspects the *single* source the taint carries — the worst one —
      // rather than asking whether any server source contributed. Mixing a
      // browser read into an expression that also carries `req.query`
      // therefore suppresses a genuine server-side finding. Narrow (it needs
      // isomorphic code where both are in scope), but it is a suppression
      // rather than a limit.
      handler(`fetch(req.query.url + location.search)`),
      handler(`fetch(req.query.url + document.cookie)`),
    ],
    invalid: [
      // Fastify's argument names.
      {
        code: `async function route(request, reply) { await fetch(request.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
      // A server source concatenated with a *literal* still reports — the
      // suppression above is specific to a browser source joining the flow.
      {
        code: handler(`fetch(req.query.url + '?x=1')`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A Next.js App Router route handler names its parameter `request`,
      // which the Fastify source entry matches — so the App Router's own way
      // of reading a query parameter (off `request.url`) is caught, unlike the
      // page-props shape recorded above.
      {
        code: `export async function GET(request) { const u = new URL(request.url).searchParams.get('target'); return fetch(u) }`,
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },

  {
    // --- authorityIsFixed: is the host already decided? ---------------------
    //
    // A hand-rolled lexical scan of a template or `+` chain. It walks the
    // parts in order and asks whether a literal `/`, `?` or `#` closes the
    // authority before any untrusted interpolation reaches it. Everything
    // below is an attempt to make it read an attacker-controllable authority
    // as fixed.
    valid: [
      // SAFE — the narrowing doing its job. A tainted segment after a fixed
      // origin is a path-traversal or open-redirect concern for the rules
      // that own those, but it is not CWE-918: the request lands on
      // api.example.com whatever the segment contains.
      handler('fetch(`https://api.example.com/items/${req.params.id}`)'),
      handler("fetch('https://api.example.com/items/' + req.params.id)"),
      handler('fetch(`${process.env.API}/x/${req.params.id}`)'),
      handler('fetch(`https://api.example.com?u=${req.query.u}`)'),
      handler('fetch(`https://api.example.com#${req.query.u}`)'),
      handler('fetch(`https://api.example.com/${`${req.query.id}`}`)'),
      // SAFE — `@` in a path segment is just a path segment, and a nested
      // absolute URL inside a query string is somebody else's problem.
      handler('fetch(`https://api.example.com/${req.query.p}`)'),
      handler('fetch(`https://api.example.com/r?to=http://${req.query.host}`)'),
      // SAFE — the whitespace that the WHATWG parser strips (tab, newline)
      // does not move the authority, and a raw space makes the URL fail to
      // parse rather than re-host it.
      handler('fetch(`https://api.example.com\t/${req.query.p}`)'),
      handler('fetch(`https://api.example.com\n/${req.query.p}`)'),
      // SAFE — same narrowing applied to a sink inside a called helper, where
      // "tainted" means "resolves to a parameter of the callee".
      'function get(id) { return fetch(`https://api.example.com/items/${id}`) }\nfunction handler(req) { get(req.params.id) }',

      // MISS, no exploit: an untainted hole followed by `/` reads as fixed
      // with no scheme anywhere. The result is a relative URL, so this bounds
      // the split-scheme hole (now closed, asserted in `invalid`) rather than
      // being one itself.
      handler('const path = getPath(); fetch(`${path}/${req.query.host}`)'),

      // ADVERSARIAL MISS: the narrowing's load-bearing assumption is that an
      // untainted interpolation is a trusted origin. Where taint is lost for
      // an unrelated reason — a container round-trip, an unknown call — an
      // attacker-controlled base reads as trusted, and now it also suppresses
      // the sibling taint that used to make the call visible. Neither base was
      // ever detectable, so no new vulnerability class; what is new is that
      // the accidental finding is gone.
      handler('const o = { base: req.query.base }; fetch(`${o.base}/x/${req.query.id}`)'),
      handler('const base = normalize(req.query.base); fetch(`${base}/x/${req.query.id}`)'),
      // ADVERSARIAL MISS: Array#join is not a parts list urlParts understands,
      // and it is not a taint path the engine follows either — so the array
      // container wall hides it first.
      handler("fetch(['https://api.example.com', req.query.p].join('/'))"),
    ],
    invalid: [
      // The authority is still open in every one of these, and stays reported.
      // Taint before any terminator; no terminator at all (the `@evil.com`
      // re-host); a tainted base; protocol-relative; an interpolated scheme
      // written inline with its `://`, which is explicitly not counted as a
      // terminator; and tainted userinfo.
      {
        code: handler('fetch(`https://${req.query.host}/x`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler("fetch('https://api.example.com' + req.path)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler('fetch(`${req.query.base}/x`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler("const scheme = 'https'; fetch(`${scheme}://${req.query.host}/x`)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler('fetch(`https://${req.query.user}@api.example.com/x`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // The split-scheme hole, found by this corpus and since closed: a
      // scheme held in a variable puts exactly one `//` between the hole and
      // the untrusted host, and reading that `//` as a terminator declared a
      // plain host injection to be fixed. A leading `//` in static text now
      // opens an authority instead of closing one. Choosing the scheme from
      // `req.secure` or `x-forwarded-proto` is ordinary behind a proxy.
      {
        code: handler("const proto = 'https:'; fetch(`${proto}//${req.query.host}/x`)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: handler("const proto = req.secure ? 'https:' : 'http:'; fetch(`${proto}//${req.query.host}/x`)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: "function get(host) { const p = 'https:'; return fetch(`${p}//${host}/x`) }\nfunction handler(req) { get(req.query.host) }",
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        // The degenerate spelling — an empty interpolation was enough.
        code: handler("fetch(`https:${''}//${req.query.host}/x`)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A fixed origin held in a variable with no static text between it and
      // the taint: nothing proves the base ends where the path begins, so
      // `${u}${req.query.p}` with `p = '@evil.com'` is still reported.
      {
        code: handler("const u = 'https://api.example.com'; fetch(`${u}${req.query.p}`)"),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A backslash is not a terminator here even though the WHATWG parser
      // treats it as one for special schemes. Conservative in the safe
      // direction, and asserted so a future "helpful" addition of `\\` to the
      // terminator set has to argue with a test.
      {
        code: handler('fetch(`https://api.example.com\\\\${req.query.p}`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Percent-encoded `/` does not close an authority.
      {
        code: handler('fetch(`https://api.example.com%2F${req.query.p}`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // A nested template carrying the host: urlParts does not flatten it, so
      // it stays a hole, and the hole is tainted.
      {
        code: handler('fetch(`${`https://${req.query.host}`}/x`)'),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      // Same-shape helpers: the narrowing must not swallow an open authority
      // just because the sink is one call away.
      {
        code: 'function get(host) { return fetch(`https://${host}/x`) }\nfunction handler(req) { get(req.query.host) }',
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: "function get(p) { return fetch('https://api.example.com' + p) }\nfunction handler(req) { get(req.query.p) }",
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },

  {
    // --- the receiver narrowing --------------------------------------------
    // Member-rooted `ssrf.*` sinks now require a plain Identifier receiver, so
    // an injected client cannot be mistaken for the package namespace.
    valid: [
      // DELIBERATE: an injected HttpClient/HttpService takes a *path* against
      // a configured base, not an absolute URL, and reporting SSRF on it is
      // simply wrong. The cost is recorded honestly — a genuine axios instance
      // parked on `this` or on a deps bag is now invisible too.
      handler('this.http.get(req.query.url)'),
      handler('services.axios.get(req.query.url)'),
      handler('deps.https.request(req.query.url)'),
      'class S { constructor(a) { this.axios = a } run(req) { this.axios.get(req.query.url) } }',
    ],
    invalid: [
      // A module namespace is a plain identifier in every real spelling, so
      // the narrowing costs nothing on the shapes that matter.
      {
        code: `import axios from 'axios'
               function handler(req) { axios.get(req.query.url) }`,
        errors: [{ messageId: 'ssrf' }],
      },
    ],
  },
))
