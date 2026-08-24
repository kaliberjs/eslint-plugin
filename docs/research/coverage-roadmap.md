# Coverage roadmap — from the shipped 16 to everything statically lintable

Canonical backlog companion to `rule-inventory.yaml`. Written 2026-08-24,
after the first sixteen security rules landed. Answers: what does "100% of
what a JS/TS linter can do" mean, and what is the path there?

## The honest definition of done

100% of *statically visible* weaknesses. Not 100% of the CWE universe:
memory-safety classes (#787/#125/#416/#476), presence-of-control checks
(rate limiting, CSRF middleware, session fixation), and dependency
vulnerabilities (A06 — SCA's job) are permanently out of scope, per
`taxonomy.md` §7. Everything else in the 79-entry inventory ships — either
directly, or in Tier 3's narrowed forms after machinery work.

## Current state

16 rules shipped (`configs.security`, opt-in). Every inventory entry scoring
≥100 is covered except the secrets family, held deliberately pending the
scope decision below.

## Tier 1 — directly lintable today (~20 rules, no new machinery)

Literal matching, options-object matching, or existing taint kinds. Each ≤1 day.

| id | score | note |
|----|-------|------|
| no-permissive-cors | 80 | two-tier: origin-reflection+credentials = finding; bare '*' = info |
| no-insecure-cookie-flags | 53.3 | session/auth-pattern cookie names only, by default |
| no-javascript-url | 48 | href/src javascript: literals |
| no-sensitive-data-in-web-storage | 48 | tokens/session keys into localStorage/sessionStorage |
| no-plain-http-url | 45 | http:// literals into request APIs; ws:// too |
| no-dynamic-require | 45 | require(variable) |
| no-disabled-security-framework-check | 45 | helmet()/express-limiter disabled or absent-by-config |
| no-xxe | 80 | libxmljs/xml2js entity options |
| no-unsafe-deserialization | 80 | node-serialize unserialize, js-yaml load w/o schema |
| no-sha1-for-security | 13.5 | bundles with md5 |
| no-static-iv | 32 | constant IV reused across calls |
| no-template-autoescape-disabled | 21.3 | nunjucks/handlebars autoescape off |
| no-timing-unsafe-secret-comparison | 18 | === on secrets instead of timingSafeEqual |
| no-jquery-html-sink | 32 | $(html-string), .html(x) |
| no-target-blank-without-noopener | 80 | window.open without noopener (the part still relevant) |

Secrets family (precise half only — literal secrets passed to sign/createCipheriv/
Pool configs; NO entropy scanning, ever):
no-hardcoded-credentials (53.3), no-hardcoded-crypto-key (75),
no-weak-jwt-secret (150), no-hardcoded-api-key (22.5).

Plus deep-dive finds riding along: err.stack/err.message in HTTP responses
(CWE-209, missing from the inventory entirely), Redis Lua EVAL sink,
Elasticsearch query-DSL sink.

## Tier 2 — taint-ready registry data (~15 rules)

The kinds exist; these need source/sink entries plus corpora.
path-traversal (45), zip-slip (40), arbitrary-file-read/write (30/40),
open-redirect + client-side variant (36/24), nosql-injection (80),
server-side-template-injection (80), ldap/xpath/expression-language injection
(32/24/12), user-controlled-regexp (33.8), dangerous-url-construction (48),
reflected-xss (13.5), log-injection (9.6), request-body-log (12),
secret-in-log (32), insecure-random done properly via sink-gating (40),
polynomial-redos (6.8).

## Tier 3 — "almost lintable": pushing ESLint

In leverage order:

1. **Sanitizer modelling** — register zod/joi/DOMPurify parse results as
   `sanitizedFor` sources. Converts warn-noise into precision across every
   existing rule; unlocks mass-assignment (18.0 score, API3:2023 mapping).
2. **Flow sensitivity** — kills the standing early-return allowlist `todo`;
   the most embarrassing remaining false-positive class.
3. **Interprocedural-lite** — extend module-sink resolution to *values* that
   cross file boundaries within a package. Unlocks the SSRF family and part
   of A01. Smallest version first: one-hop helper functions in the same
   package.
4. **String/value analysis** — statically track content/length of strings.
   Unlocks weak-key-size (150) and predictable-token (30) honestly.
5. **Non-JS processing** — ESLint processors for .env files, JSON/YAML config,
   firebase.rules.json, Dockerfiles. The config-half of A05 lives outside JS.
   Spike before committing; this changes what the plugin is.

## Governance gates (non-negotiable at any cadence)

Adversarial pass over everything post-SQL before release. Measured FP rates
against real kaliber projects before declaring any tier done. Useful findings ÷
false-positive burden remains the only metric that matters.

## Dogfood measurement — 2026-08-24

First evidence pass, two real kaliber projects, all 24 rules at warn:

| project | first-party files | security findings | triage |
|---|---|---|---|
| asito-werkenbij | 327 | 6 | 6 FP: icon sprites (`__html: icon`) and config-built inline scripts (`JSON.stringify(config.x)` interpolation) |
| alliander | 360 | 62 | ~1 FP (innerHTML save/restore idiom), rest of src hits all one family: CMS rich text rendered via dangerouslySetInnerHTML (`quote`, `title`, `i18n(...)`) |

Zero crashes. Zero true vulnerabilities found (also expected: these are
maintained sites). Every finding lands in ONE documented family: dynamic-but-
trusted HTML. The noise profile is therefore not spread across rules — it is
concentrated exactly where the roadmap said sanitizer modelling would pay.

Key discovery: consumers cannot currently register a trusted-HTML source
(e.g. the `i18n()` helper) as a sanitizer, because registry.validate()
requires a receiver constraint on method-rooted sanitizers — and bare
helper calls like `i18n('x')` have none. That validation rule exists to
stop wrongly-trusted escapers, which is correct, but it blocks the exact
configuration the dogfood run shows teams need. Resolution belongs to
Tier 3 item 1 (sanitizer modelling): an explicit opt-in shape for
user-registered helpers, distinct from built-in escapers.

Interim guidance for CMS-heavy projects until then: disable
security-no-dangerously-set-inner-html per project, or line-disable with a
comment at trusted render sites. Both keep the other 23 rules active.

### Tier 3 item 1: sanitizer modelling — shipped 2026-08-24

The minimal high-leverage version is done:

- `root.helper` — consumers register bare trusted helpers (`i18n()`, CMS
  getters) explicitly; bare *method*-name registration stays rejected.
- Consumer entries accept plain-string method/receiver patterns, matching
  built-in regex ergonomics.
- `sanitizedAt(node, kind)` on the analysis lets matcher-style rules ask
  "was a clearing call made here" independent of taint; dsih consumes it,
  so both DOM rules honor registrations.

This resolves the dogfood blocker: the alliander CMS family and the asito
config-script family are now one settings block per project instead of
per-line disables.

### Tier 3 item 2: flow sensitivity — shipped

The allowlist-guard proof (`if (!TABLES.includes(t)) return`) landed, and
was later generalized to a second guard shape: path-containment
(`if (!resolved.startsWith(base)) return`), needed once path.resolve's own
propagation gap was fixed and its "resolve-then-check" remediation had to
be provable rather than accidentally quiet. Remaining Tier 3:
interprocedural-lite, string/value analysis, non-JS processors.

## Dogfood measurement — rabobank-jobs

Third real kaliber project, all 38 rules at warn (`configs.security`), run
externally against the checkout (no dependency added, nothing committed
there) via this repo's own ESLint 10 pointed at rabobank-jobs' source.

| project | first-party files | security findings | time | triage |
|---|---|---|---|---|
| rabobank-jobs | 686 | 14 → 5 after fixes | 2.4s | see below |

Zero crashes. Two NEW false-positive classes not seen in the asito/
alliander runs, both now fixed:

- `no-target-blank-without-noopener`: `rel="noreferrer"` implies
  `noopener` per the HTML spec, but the check only matched the literal
  substring `noopener`. 4 of 4 target="_blank" anchors in the project
  used `noreferrer` alone.
- `no-timing-unsafe-secret-comparison`: `hash !== ''` flagged a URL
  fragment (SPA routing), because `hash` is in the secret-name regex.
  Fixed structurally — skip existence checks (comparison against
  undefined/null/empty-string) rather than narrowing the regex, since an
  existence check leaks no timing information about a secret regardless
  of the identifier's name.

One instance of the already-documented dynamic-but-trusted-HTML family,
same shape as the asito/alliander runs but a new sanitizer: `@kaliber/
safe-json-stringify` (escapes `<`, `>`, `/`, U+2028/U+2029 — verified
against its source — exactly the JSON-in-script-tag shape used for
structured data and analytics dataLayer pushes). Registered as the first
built-in `root.helper` sanitizer; this also required generalizing
no-dangerously-set-inner-html's constant check to look inside template
literals per-interpolation, since the real usage is a sanitizer call
interpolated into an otherwise-static template, not a bare call.

Residual 5 findings are all genuine dynamic-but-*unverified*-HTML: a raw
SVG icon prop, CMS rich text, search-highlight markup, font-face CSS, and
one unsanitized tracking-script interpolation. None resolved by a
sanitizer registration — each needs a human decision about the actual
trust boundary, which is the rule doing its job.
