# Production-readiness report — security rule set

Records the release verification for the first production release of the
security rules. Everything here is a measurement or a triage decision, not a
plan. The plan it closes out is `production-readiness-plan.md`.

Date of run: 2026-08-30. Branch `feat/owasp-security`.

## Verification

| Command | Result |
|---|---|
| `pnpm test` | 464 tests, 463 pass, 0 fail, 1 todo |
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm benchmark:security` | see `performance.md` |

Environment: node v24.15.0, ESLint 10.8.1, Darwin 25.5.0 arm64, Apple M2 Pro.

## Presets

`configs.security` — 18 rules. `error` for four:
`no-node-tls-reject-unauthorized`, `no-disabled-tls-verification`,
`no-jwt-alg-none`, `no-unsafe-deserialization`. Everything else `warn`.

`configs['security-audit']` — all 44 rules, `warn` throughout.

Both carry `plugins: { '@kaliber': plugin }` and are verified through
`Linter#verify` in `rules/security-presets.test.js`, which is the test that
would have caught the previous release's broken preset. `RuleTester` never
resolves the plugin namespace, so every unit test in the repo passed against a
config no consumer could use.

## Dogfood

Read-only, against every `@kaliber/build` project on this machine. Nothing was
edited in any consumer project; the plugin was pointed at their trees from this
repository with `overrideConfigFile: true`, so the projects' own configs were
not loaded.

**Corpus: 60 projects, 10307 first-party `.js`/`.jsx` files** under `src/`,
`config/`, `services/`, `scripts/`, `admin/` and `lib/`. Regenerate the project
list with `grep -l '"@kaliber/build"' */package.json` in `/Volumes/Development`.
Elapsed: ~17 s per preset for the whole corpus.

> **A first pass linted only `src/` and reported 2 baseline findings. That was
> wrong, and wrong in the direction that matters.** Kaliber projects keep their
> credentials, mail transports and API keys in `config/{dev,tst,acc,prd}.js` —
> which is precisely where the security findings are. Widening the glob took the
> baseline from 2 findings to 10 and the audit preset from 371 to 457, including
> every hardcoded-secret finding in the entire corpus. Recorded here because the
> lesson is about dogfooding, not about the rules: **a security sweep scoped to
> the application source misses the configuration, and the configuration is
> where the secrets live.**

### `configs.security` — 10 findings in 10307 files

| Rule | Findings | Triage |
|---|---|---|
| `no-disabled-tls-verification` | 8 | **8 true positives, one per project, all the same nodemailer SMTP transport in `config/prd.js`.** Six point at a *remote* relay (`postfix.transip.kaliber.io`, `pro-mail-relay-mx.bol.com`) with `rejectUnauthorized: false`, so the certificate of a real network hop is not checked. `bol-careers` is the sharpest: `requireTLS: true` *and* `rejectUnauthorized: false` *and* SMTP AUTH credentials in the same object — STARTTLS is mandatory but the peer is unauthenticated, so a path attacker presents any certificate and collects the credentials. `fietsersbond-werkeninbeweging` adds `ciphers: 'SSLv3'`. Two (`rabobank-jobs`, `bol-com-cadeaukaarten`) point at `127.0.0.1`, where the impact is nil — a loopback caveat worth adding to the rule's readme, not a reason to soften it. |
| `no-ssrf` | 1 | **true positive.** `Chromabot/src/background.js:15` — a browser-extension background script does `chrome.runtime.onMessage.addListener((request, …) => fetch(request.url))`. Any content script that can message the extension chooses the URL the privileged page fetches. Note *why* it fired: the source matched is a parameter shaped like a request object, a name-based source match. Right answer, weaker reason than the finding deserves. |
| `no-client-side-open-redirect` | 1 | **disputed one-off.** `altera-vastgoed/…/category-select.js:9` assigns to `window.location` from either a `<select>` option value or `removeLastItemFromLast(window.location.href)`. The flow reported is the second, and splitting a same-origin href on `/` and rejoining cannot leave the origin — a false positive on that branch. The other branch assigns a CMS-authored option value straight to `window.location`, so the line is not simply fine either. Documented, not suppressed. |

**No repeatable false-positive class survives in the baseline preset.** The one
finding class that repeats — the eight TLS findings — repeats because the
weakness repeats: it is one house config template copied across the fleet.

### `configs['security-audit']` — 457 findings in 10307 files

Run separately so audit noise could not contaminate the baseline measurement.

| Rule | Findings | Triage |
|---|---|---|
| `no-dangerously-set-inner-html` | 315 | Portable-text and CMS-HTML rendering, everywhere. Correct by the rule's definition (a non-constant value) and useless as a gate — **69% of the audit preset's entire output is this one rule.** This is the measurement that justifies the preset split; before this release it sat in the single opt-in config. |
| `no-hardcoded-api-key` | 44 | Google API keys in `config/*.js`, four per project across dev/tst/acc/prd. Shape-matched, so "is this key restricted by HTTP referrer" is not a question the rule can answer — a browser Maps key is meant to be public. Worth one pass by someone who knows which of these are restricted. |
| `no-hardcoded-credentials` | 31 | Basic-auth passwords, SMTP `pass`, OAuth `clientSecret`, and a `secret` in a recovery-link script. All literal, all in git history. Same caveat: several are low-value environment gates rather than production credentials. |
| `no-jquery-html-sink` | 20 | Legacy jQuery projects. `.append()` on real jQuery objects. Correct, and correctly medium-confidence — the receiver is matched by method name. |
| `no-inner-html` | 11 | Hand-written DOM code. The tainted subset of this is `no-dom-xss-sink`'s job and is in the baseline. |
| `no-target-blank-without-noopener` | 9 | All real `window.open()` without `noopener`, mostly Sanity Studio document actions. **True positives**, low impact. **Zero anchor findings** — the point of the Phase 3 change. Before it, this rule's output here would have been dominated by ordinary `<a target="_blank">`. |
| `no-md5` | 5 | `generateRandomKey.js`, `md5.js`, `hash.js` — cache keys and identifiers, not security use. The documented accepted false positive, and why the rule is audit-only. |
| `no-dynamic-require` | 5 | `import()` of a non-literal, mostly in tests and build scripts. |
| `no-plain-http-url` | 4 | Cleartext `http://` in footer and team data. Correct. |
| `no-timing-unsafe-secret-comparison` | 2 | `rituals-careers/src/validateWebhookPayload.js:69` compares an HMAC-SHA256 webhook signature with `===`. **A genuine CWE-208 finding and the best single finding in the run.** |
| `no-weak-jwt-secret`, `no-ssrf`, `no-client-side-open-redirect` | 1 each | |

Zero findings from the remaining 33 rules across 10307 files.

### Three defects the dogfood found

All fixed, all with a regression test. None was reachable from the existing
suites.

1. **`no-plain-http-url` rendered `a cleartext 'undefined' endpoint`.** The
   scheme regex had no capture group, so `{{scheme}}` interpolated `undefined`
   for every `http://` finding. No test had ever asserted rendered message text,
   only `messageId`. Tests now assert `data: { scheme }`.

2. **`no-timing-unsafe-secret-comparison` had a repeatable false-positive
   family.** `hash` was in its secret-name pattern and **8 of its 14 findings
   were `location.hash` fragments compared against an anchor id**, across six
   projects. `hash` is out of the pattern; `passwordHash` and `tokenHash` still
   match through their other half. Findings went 14 → 2, both true positives.

   The rule's own source comment already recorded this false positive from an
   earlier dogfood run, and the previous fix handled only the `hash !== ''` case.
   Worth remembering as the shape of the mistake: a narrow fix for one instance
   of a family, where the family was the problem.

3. **`no-jwt-algorithm-confusion` reported a correctly pinned call.**
   `bol-com-cadeaukaarten/services/superOffice/systemUserTicket.js:96` does

   ```js
   const options = { ignoreExpiration: true, algorithms: ['RS256'] }
   jwt.verify(token, publicKey, options, (err, decoded) => …)
   ```

   `findOptionsObject` accepted only an inline `ObjectExpression`, so lifting the
   options out — which the callback form invites — read as "no algorithms
   pinned". It now resolves one hop to a same-file object literal, the depth every
   other matcher here uses. `config.jwtOptions` and an options object that
   genuinely pins nothing are still reported; resolving the binding is not the
   same as trusting it.

## Remaining risks

**Accepted static-analysis limitations** (not work items):

- The baseline preset's taint rules are intra-file plus one hop of cross-file
  resolution. Anything routed through a runtime-assembled dispatch table, a
  framework's own request lifecycle, or a dependency is invisible.
- No rule can see A03:2025 (supply chain), A06:2025 (insecure design) or
  A10:2025 (exceptional conditions). See `owasp-coverage.md`.
- Audit-preset rules match by name where no import can be resolved (CDN
  globals, `<script>` tags, values handed in as parameters). Their confidence is
  capped at medium and their readmes say so.
- `no-dangerously-set-inner-html` cannot distinguish CMS portable text from
  attacker-controlled HTML. It never will; that is a question about the CMS.

**Still open** (work, not limitation):

- **The single-file `< 1 ms` performance budget is not met by the preset**
  (5.3 ms for 18 rules on a 48 KB no-sink file). It is met per rule, at ~0.3 ms
  per taint rule. Each rule runs its own AST traversal; collapsing them into a
  shared visitor is an architecture change and is not in this release.
  `performance.md` states this rather than quoting the per-rule figure.
- **The dogfood corpus is all `@kaliber/build` projects.** No Next.js, NestJS or
  Fastify code was linted, and the registry models sinks for all three. Their
  false-positive behaviour is unmeasured.
- **`no-disabled-tls-verification` says "any network-position attacker can
  intercept it" regardless of the host.** For the two loopback findings that is
  untrue. The rule has no `SAFE_HOSTS` notion, though its sibling
  `no-plain-http-url` does. Either read the sibling `host` property, or say so in
  the readme; right now the message overstates two of eight findings.
- **The eight TLS findings are the fleet's, not the plugin's.** They are a house
  `config/prd.js` template with `rejectUnauthorized: false` on a remote SMTP
  relay, in six projects, one of them alongside SMTP credentials. Worth raising
  outside this repository.
- **Module-graph caches are process-lifetime with no invalidation.** Correct for
  `pnpm lint`, wrong for a watch-mode or editor process. Marked `ponytail:` in
  `module-graph.js`.
- **`no-client-side-open-redirect`'s disputed finding** above deserves a second
  look before the next release: if same-origin-derived navigation turns out to
  be a common shape, it is a false-positive family in a baseline rule.
