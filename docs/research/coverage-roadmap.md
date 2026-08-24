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
