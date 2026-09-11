# security-no-ssrf

Detects untrusted input flowing into the URL of an outbound HTTP request.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** computed per flow and reported in the message — the analysis is sure the value reaches the sink, less sure how far it travelled. Findings below the floor in `machinery/security/finding.js` are not reported at all.
- **CWE:** [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
- **CAPEC:** [CAPEC-664](https://capec.mitre.org/data/definitions/664.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A10:2021 – Server-Side Request Forgery (SSRF)](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.3.6` — "Verify that the application protects against Server-side Request Forgery (SSRF) attacks, by validating untrusted data against an allowlist of protocols, domains, paths and ports and sanitizing potentially dangerous characters before using the data to call another service."

## What it detects

A flow from a registered untrusted source to the URL argument of an
outbound request:

```
req.query.url  ->  url  ->  fetch(url)
    source        alias       sink
```

The server, not the attacker, is the one making the request — which means
it makes it from inside the network, as itself. The targets that matter are
never on the public internet: the cloud metadata endpoint
(`169.254.169.254`, credentials in plain text on most providers), admin
services bound to `localhost`, internal APIs that skip authentication
because "only we can reach them", and `file://` for local reads.

### Sinks

Registered under the `url` kind with `ssrf.` ids (see
`machinery/security/registry.js`):

| Sink | Shape |
| --- | --- |
| `fetch(url)` | bare global, Node 18+ and every browser |
| `window.fetch` / `globalThis.fetch` / `self.fetch` | method + receiver |
| `node-fetch`, `cross-fetch`, `isomorphic-fetch` | default import |
| `axios(url)`, `axios.get/post/put/patch/delete/head/options/request` | module-rooted + `axios` receiver |
| `got(url)`, `got.get/post/...` | module-rooted + `got` receiver |
| `http.get`, `http.request`, `https.get`, `https.request` | module-rooted + `http`/`https` receiver |
| `undici.request/stream/fetch/upgrade/connect` | module-rooted + `undici` receiver |

Native `fetch` is the priority case, and it is also the reason this rule
could not exist until now: `fetch` is never imported, so neither of the two
sink shapes the engine supported (method + receiver, or a module-rooted
import binding) could bind to it. The registry gained a third,
`root: { global: 'fetch' }`, matched through the same shadowing-safe check
the browser sources use for `location` — so a project's own
`const fetch = require('./our-fetch')` correctly does not match.

The rule also reports sinks reached **inside a called function's body**, via
the shared `reportReachableSinks` helper — the shape a route handler
delegating to a data-layer helper actually has:

```js
// data.js
export function fetchRemote(url) { return fetch(url) }

// handler.js
function handler(req) { return fetchRemote(req.query.url) }   // reported here
```

## Incorrect

```js
async function handler(req, res) {
  const preview = await fetch(req.query.url)     // http://169.254.169.254/latest/meta-data/
  res.json(await preview.json())
}
```

```js
// A fixed base does not fix the origin. `new URL('//evil.example.com/x',
// 'https://api.example.com')` is https://evil.example.com/x, and a value
// starting with a scheme replaces the base outright. Reported, correctly.
fetch(new URL(req.query.path, 'https://api.example.com'))
```

## Correct

```js
const ALLOWED_HOSTS = ['images.example.com', 'cdn.example.com']

async function handler(req, res) {
  const target = new URL(req.query.url)
  if (!ALLOWED_HOSTS.includes(target.hostname)) return res.status(400).end()

  const preview = await fetch(target)
}
```

A membership check against a literal collection of hosts is the OWASP
remediation, and the analysis proves it: a `hostname` / `host` / `origin`
read of the guarded expression, checked against a foldable literal
collection, clears the flow for every later use in that function. Both the
early-return form above and the positive `if (ALLOWED.includes(...)) { ... }`
form are recognised, and so is checking the raw string —
`ALLOWED.includes(new URL(raw).hostname)` then `fetch(raw)`.

The other correct shape is keeping the origin out of input entirely:

```js
fetch(`${process.env.API_URL}/items/${req.params.id}`)
```

This is quiet without any escaping, and the reason is the whole of CWE-918:
the authority is already fixed by the literal `/` before any untrusted text
arrives, so the request goes to `API_URL`'s host whatever `id` contains.
The rule scans the template or `+` chain and asks only one question — can
input still influence the host? Four shapes where it can, all still
reported:

```js
fetch(`https://${req.query.host}/items`)          // taint is the host
fetch('https://api.example.com' + req.path)       // no `/` yet: `@evil.com` re-hosts it
fetch(`${req.query.base}/items`)                  // the base itself is untrusted
fetch('//' + req.query.host)                      // protocol-relative
```

Escaping an already-fixed-origin segment with `encodeURIComponent` is still
worth doing — for path traversal and parameter injection *within* that host,
which are different weaknesses with their own rules.

## What this rule deliberately stays quiet about

- **Browser code.** A `location`/`document` source reaching `fetch` is not
  SSRF: no server makes that request, and CORS applies. Those flows belong
  to `security-no-client-side-open-redirect`.
- **Injected clients.** `this.http.get(path)`, `services.axios.get(path)` —
  an Angular `HttpClient`, a Nest `HttpService` or a test double takes a
  path against a configured base, not an absolute URL. A member-rooted sink
  only matches a plain identifier receiver, which is what a module
  namespace always is.

## Why this confidence level

Confidence is per finding, not per rule, and comes from the flow: an
Express `req.query.*` source is 0.75 (matched by parameter name), a browser
source is 0.9, and each modelling hop — a template interpolation, a
parameter crossing, a reassigned variable — costs a little more. Findings
below the reporting floor are computed and dropped. When a finding is under
0.8 the message says which hops made it uncertain.

Three narrowings, all from the false-positive pass and all rule-local, keep
that number honest rather than inflated: the fixed-authority check above,
the identifier-receiver requirement, and dropping browser sources. None of
them costs a true positive — in each case the reported flow could not
influence which host the *server* connects to, which is the entire
weakness.

The sink side is where the precision comes from: unlike `query` or `exec`,
`fetch` is unambiguous, and the module-rooted and narrow-receiver forms of
the others mean a match is a real HTTP client, not a name collision.
Severity is high without qualification — SSRF's worst case is cloud
credential theft, and CVSS ratings for the class routinely land at 9+.

## Matching scope

Deliberately narrow on the receiver side. `axios.get` matches; `api.get`,
`client.get` and `cache.get` do not, and that is not an oversight —
`.get(...)` on a locally named object is one of the most common calls in any
codebase, overwhelmingly not an HTTP request to an attacker-chosen host.
Projects with a named instance (`const api = axios.create()`) register it
themselves:

```js
settings: {
  '@kaliber/security': {
    registry: {
      sinks: [{
        id: 'ssrf.our-api-client',
        root: { method: /^(get|post)$/, receiver: /^api$/ },
        argument: 0, requires: 'url', severity: 'high', cwe: 'CWE-918', owasp: 'A10:2021',
      }],
    },
  },
}
```

## Limitations

Stated honestly:

- **Config-object call forms are not covered.** `axios({ url })`,
  `http.get({ host, path })` and `fetch(new Request(url))` pass an object,
  and an object literal carries no taint through this analysis. Real misses,
  not claims of safety.
- **`const fetch = require('node-fetch')`** binds the whole module rather
  than a named export, which the module-rooted matcher does not resolve. The
  `import fetch from 'node-fetch'` form does match.
- **Named client instances are misses** by design — see Matching scope.
- **Redirect following is not modelled.** An allowlisted host that responds
  `302 Location: http://169.254.169.254/` walks the request straight back
  inside; that is a separate inventory entry (`no-redirect-following-ssrf`)
  and needs the client's `maxRedirects`/`redirect` option, not taint.
- **DNS rebinding and decimal/octal IP encodings** are outside what any
  static check can see. A hostname allowlist checked once and resolved later
  is a TOCTOU the linter reads as safe.
- **Cross-file object-destructured parameters** are the shared
  reachable-sinks miss: `fetchRemote({ url })` where `fetchRemote` lives in
  another file is not followed (the same-file case is).
- **The authority check follows an identifier one hop, same file only.** An
  interpolation hole is resolved to a same-file `const`'s own initializer, or
  — via the same one-hop `reachableSinksOf` every reachable-sink rule uses —
  the concrete argument the one call site this rule can see actually passed.
  The common project fetch-wrapper idiom is covered by this:

  ```js
  const BASE = process.env.API_URL
  function api(path) { return fetch(`${BASE}${path}`) }
  api(`/items/${req.params.id}`)   // quiet: path resolves to a literal-prefixed segment
  api('@evil.com/x')               // still reports: the resolved argument re-hosts it
  ```

  What is still a documented miss: a wrapper imported from **another file**
  (the caller-argument node never crosses a file boundary, only its taint
  value does — see Cross-file object-destructured parameters, above, for the
  same wall), a hole more than one hop from the call site this rule sees
  (`api` calling a second helper that does the interpolation), and a base
  assembled by `.concat()` or `.replace()` rather than a template or `+`
  chain, which is invisible to the lexical scan regardless of resolution.
- **The authority check does not run on a cross-file helper's body**, whose
  scopes this file's analysis cannot resolve — so a helper in another module
  that composes a fixed-origin URL from a tainted path segment still
  reports. Conservative on purpose: the alternative is dropping findings.
- **A flow that mixes a browser source into a server one is suppressed**
  (`fetch(req.query.url + location.search)`), because the finding carries
  one worst source and that source is a browser read. Needs isomorphic code
  with both in scope; narrow, but a suppression rather than a limit.
- **A local binding named exactly `http`, `https`, `axios` or `got`** is
  trusted to be the module — the same name-plus-tainted-argument bar
  `sql.query` (`db.query`) and `shell.shelljs.exec` (`sh.exec`) ship at. A
  project-local `machinery/http` under that name reports; turn the entry off
  with `registry.disable = ['ssrf.node.http.member']`.
- **A named client instance** (`const api = axios.create()`), a
  `const fetch = require('node-fetch')` binding, and the config-object call
  forms are all misses; see above.

### Allowlist spellings the guard cannot prove

The membership guard needs a foldable literal collection and textual
identity with the checked expression. These are correct code that still
reports — write one of the proven forms above instead, or suppress:

```js
if (!ALLOWED.includes(h)) { res.status(400); return }   // non-abrupt block
if (target.hostname !== 'images.example.com') return    // equality, not membership
import { ALLOWED_HOSTS } from './config'                // not foldable
const ALLOWED = process.env.HOSTS.split(',')            // not foldable
if (!isAllowed(target)) return                          // guards do not cross functions
const { hostname } = new URL(input)                     // destructured, not `x.hostname`
```

A reassignment *after* a proven guard also inherits the proof
(`if (!ALLOWED.includes(t.hostname)) return; t = new URL(other)`) — a
pre-existing flow-insensitivity in the guard layer, shared with every rule
that uses it.

### Out of scope for this pass, on purpose

The inventory lists three more sink families that are a different *shape* of
problem — a property inside a configuration object rather than a call
argument — and are not implemented here:

- `puppeteer` / `playwright` `page.goto(url)`
- image and document processors that accept a remote URL
- `http-proxy-middleware`'s `target` option

Narrow scope shipped correctly beats broad scope shipped wrong; these need
an object-property matcher (the shape `no-elasticsearch-injection` uses) and
should be added as a follow-up, with their own false-positive pass.

## Prior art

- CodeQL [`js/request-forgery`](https://codeql.github.com/codeql-query-help/javascript/js-request-forgery/) — same source→sink model, same client library set, with type information this rule does not have.
- Semgrep `javascript.lang.security.audit.*ssrf*` rules.
- Snyk Code's SSRF ruleset for Node.

## References

- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP A10:2021 – Server-Side Request Forgery](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)
- [CWE-918](https://cwe.mitre.org/data/definitions/918.html)
- [MDN: `fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [WHATWG URL Standard — parsing against a base URL](https://url.spec.whatwg.org/#concept-basic-url-parser)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
