# OWASP Top 10 (2021) coverage — what's shipped, what's missing

A living tracking document, not a research log (that's `coverage-roadmap.md`).
Regenerate the counts below from source whenever rules are added or removed —
they were computed from `rules/security/*/readme.md`'s `**OWASP:**` line,
falling back to `docs/research/rule-inventory.yaml`'s `owasp_top10_2021` field
for rules shipped before that line existed, cross-checked directly against
the raw YAML (a first pass mis-extracted several entries — always verify a
generated table like this against the source it was generated from before
trusting it). **44 rules shipped**, **38 candidates in the inventory not yet
shipped**, as of this writing.

## Coverage by category

| Category | Shipped | Missing candidates | Notes |
|---|---|---|---|
| A01:2021 – Broken Access Control | 5 | 8 | structurally the hardest category — see below · `no-zip-slip` shipped 2026-08-25 |
| A02:2021 – Cryptographic Failures | 15 | 6 | best-covered category by far · `no-weak-key-size` shipped 2026-08-25 |
| A03:2021 – Injection | 13 | 10 | best-covered *and* most candidates remain |
| A04:2021 – Insecure Design | **0** | 3 | all low-scoring |
| A05:2021 – Security Misconfiguration | 4 | 2 | |
| A06:2021 – Vulnerable and Outdated Components | **0** | **0** | out of scope by design, not a gap |
| A07:2021 – Identification and Authentication Failures | 3 | 1 | |
| A08:2021 – Software and Data Integrity Failures | 1 | 3 | |
| A09:2021 – Security Logging and Monitoring Failures | 1 | 3 | |
| A10:2021 – Server-Side Request Forgery (SSRF) | 1 | 2 | `no-ssrf` shipped 2026-08-25 |

## A06 is not a gap — it's structurally the wrong tool

"Vulnerable and Outdated Components" is a *dependency-version* question — it
needs a manifest/lockfile and a vulnerability database, not an AST. That's
Dependabot's, `npm audit`'s, and Snyk's job. An ESLint rule cannot see a
package's installed version, so zero rules here is the correct number, not
a missing one.

## Shipped, by category

**A01 — Broken Access Control** (5): `no-client-side-open-redirect`,
`no-firebase-path-injection`, `no-open-redirect`, `no-path-traversal`,
`no-zip-slip`

**A02 — Cryptographic Failures** (15): `no-des-3des`,
`no-disabled-tls-verification`, `no-ecb-mode`, `no-hardcoded-crypto-key`,
`no-jwt-alg-none`, `no-jwt-algorithm-confusion`, `no-md5`,
`no-node-tls-reject-unauthorized`, `no-plain-http-url`,
`no-sensitive-data-in-web-storage`, `no-sha1-for-security`, `no-static-iv`,
`no-timing-unsafe-secret-comparison`, `no-weak-jwt-secret`,
`no-weak-key-size`

**A03 — Injection** (13): `no-command-injection`,
`no-dangerously-set-inner-html`, `no-dom-xss-sink`, `no-dynamic-require`,
`no-elasticsearch-injection`, `no-eval`, `no-groq-injection`, `no-inner-html`,
`no-javascript-url`, `no-jquery-html-sink`, `no-shell-true`,
`no-sql-injection`, `no-template-autoescape-disabled`

**A05 — Security Misconfiguration** (4): `no-disabled-security-framework-check`,
`no-insecure-cookie-flags`, `no-permissive-cors`, `no-xxe`

**A07 — Identification and Authentication Failures** (3):
`no-hardcoded-api-key`, `no-hardcoded-credentials`, `no-jwt-decode-without-verify`

**A08 — Software and Data Integrity Failures** (1): `no-unsafe-deserialization`

**A09 — Security Logging and Monitoring Failures** (1):
`no-authorization-header-log`

**A10 — Server-Side Request Forgery** (1): `no-ssrf`

**Not tied to a Top 10 category** (1): `no-target-blank-without-noopener`
(general web-security hygiene — `window.opener` tabnabbing, not itself one
of the ten).

## Missing candidates, by category — ranked by the inventory's priority score

Score = `(security_impact × static_detectability × ecosystem_prevalence ×
confidence) / (false_positive_risk × implementation_cost)`, from
`rule-inventory.yaml`. Higher is more worth building. `detectability` is the
inventory's own classification — `REQUIRES_RUNTIME_INFORMATION` and
`REQUIRES_INTERPROCEDURAL_ANALYSIS` entries at the bottom of a list are
there for completeness, not as a queue: a rule that needs runtime state an
ESLint rule cannot have is not close to shippable regardless of its score.

**A03 — Injection** (10 missing — the most of any category)
| Score | Detectability | Rule |
|---|---|---|
| 80.0 | PARTIALLY_DETECTABLE | `no-nosql-injection` |
| 80.0 | PARTIALLY_DETECTABLE | `no-server-side-template-injection` |
| 80.0 | STATICALLY_DETECTABLE | `no-insert-adjacent-html` |
| 80.0 | STATICALLY_DETECTABLE | `no-document-write` |
| 33.8 | PARTIALLY_DETECTABLE | `no-user-controlled-regexp` |
| 32.0 | PARTIALLY_DETECTABLE | `no-ldap-injection` |
| 24.0 | PARTIALLY_DETECTABLE | `no-xpath-injection` |
| 13.5 | REQUIRES_INTERPROCEDURAL_ANALYSIS | `no-reflected-xss` |
| 12.8 | PARTIALLY_DETECTABLE | `no-dangerous-dynamic-property-access` |
| 12.0 | PARTIALLY_DETECTABLE | `no-expression-language-injection` |

`no-insert-adjacent-html` and `no-document-write` stand out: same
detectability tier and score as rules already shipped in this family
(`no-jquery-html-sink`, `no-inner-html`), same taint kind (`html`) already
registered — registry data plus a sink entry, not new architecture. Worth
prioritizing over most of this list.

**A02 — Cryptographic Failures** (6 missing, 1 shipped from this list)
| Score | Detectability | Rule |
|---|---|---|
| 150.0 | STATICALLY_DETECTABLE | ~~`no-weak-key-size`~~ shipped 2026-08-25 |
| 60.0 | PARTIALLY_DETECTABLE | `no-weak-password-hashing` |
| 60.0 | STATICALLY_DETECTABLE | `no-wildcard-postmessage-target` |
| 40.0 | PARTIALLY_DETECTABLE | `no-insecure-random` |
| 30.0 | PARTIALLY_DETECTABLE | `no-predictable-token` |
| 24.0 | STATICALLY_DETECTABLE | `no-insecure-websocket` |
| 8.0 | PARTIALLY_DETECTABLE | `no-unsalted-password-hash` |

`no-weak-key-size` was the single highest-scoring candidate in the entire
inventory (150.0) and shipped 2026-08-25 on that basis alone, independent of
category balance — a numeric comparison at a `node:crypto` call site, no
taint and no shared-layer change. `no-wildcard-postmessage-target` (60.0,
statically detectable) is now the cheapest remaining pick here.

**A01 — Broken Access Control** (8 missing, 1 shipped from this list)
| Score | Detectability | Rule |
|---|---|---|
| 40.0 | PARTIALLY_DETECTABLE | `no-arbitrary-file-write` |
| 40.0 | PARTIALLY_DETECTABLE | ~~`no-zip-slip`~~ shipped 2026-08-25 |
| 30.0 | REQUIRES_INTERPROCEDURAL_ANALYSIS | `no-arbitrary-file-read` |
| 26.7 | PARTIALLY_DETECTABLE | `no-user-controlled-authorization-bypass` |
| 24.0 | STATICALLY_DETECTABLE | `no-insecure-temp-file` |
| 6.0 | PARTIALLY_DETECTABLE | `no-client-side-only-authorization` |
| 4.0 | REQUIRES_RUNTIME_INFORMATION | `no-idor-shaped-query` |
| 4.0 | REQUIRES_RUNTIME_INFORMATION | `no-missing-csrf-protection` |
| 1.5 | REQUIRES_RUNTIME_INFORMATION | `no-missing-authorization-middleware` |

`no-arbitrary-file-write` shares `no-path-traversal`'s existing `path` taint
kind and sink family — the "registry data, not new architecture" shape of
the A03 pair above. `no-zip-slip` shipped 2026-08-25 and did *not* use that
route: an archive entry's name is attacker-controlled by virtue of being in
the archive, with no request to trace from, so it is a call-shape matcher
like `no-weak-key-size` rather than a taint rule. It was picked out of turn,
from real `unzipper`/`tar` usage found in the Kaliber project fleet rather
than by score. The three
`REQUIRES_RUNTIME_INFORMATION` entries are why A01 — the single
highest-impact category in the real Top 10 — will structurally never be
well covered by a static linter: authorization correctness is a property of
a system's *policy*, not a file's syntax. See `rule-inventory.yaml`'s own
"HONESTY NOTE ON THE ACCESS-CONTROL FAMILY" for the full reasoning. A clean
lint run should never be read as "access control is fine."

**A10 — Server-Side Request Forgery** (2 missing, 1 shipped)
| Score | Detectability | Rule |
|---|---|---|
| 48.0 | STATICALLY_DETECTABLE | `no-dangerous-url-construction` |
| 16.9 | REQUIRES_INTERPROCEDURAL_ANALYSIS | ~~`no-ssrf`~~ shipped 2026-08-25 |
| 16.0 | PARTIALLY_DETECTABLE | `no-redirect-following-ssrf` |

Written when zero rules shipped here. `no-ssrf` shipped 2026-08-25 and took
the category from zero to nonzero after all — not by avoiding
interprocedural analysis, but because the analysis had since been built
(Tier 3 item 4) and `sinkAt` gained the global-rooted shape that native
`fetch` needs. `no-dangerous-url-construction` remains the highest-value
remaining pick here.

**A09 — Security Logging and Monitoring Failures** (3 missing)
| Score | Detectability | Rule |
|---|---|---|
| 32.0 | PARTIALLY_DETECTABLE | `no-secret-in-log` |
| 12.0 | PARTIALLY_DETECTABLE | `no-request-body-log` |
| 9.6 | PARTIALLY_DETECTABLE | `no-log-injection` |

**A08 — Software and Data Integrity Failures** (3 missing)
| Score | Detectability | Rule |
|---|---|---|
| 64.0 | PARTIALLY_DETECTABLE | `no-unsafe-object-merge` |
| 32.0 | STATICALLY_DETECTABLE | `no-postmessage-without-origin-check` |
| 12.0 | PARTIALLY_DETECTABLE | `no-prototype-pollution-assignment` |

**A04 — Insecure Design** (3 missing)
| Score | Detectability | Rule |
|---|---|---|
| 18.0 | PARTIALLY_DETECTABLE | `no-mass-assignment` |
| 16.0 | PARTIALLY_DETECTABLE | `no-unrestricted-file-upload` |
| 3.0 | REQUIRES_RUNTIME_INFORMATION | `no-missing-rate-limiting` |

**A05 — Security Misconfiguration** (2 missing)
| Score | Detectability | Rule |
|---|---|---|
| 16.0 | STATICALLY_DETECTABLE | `no-unsafe-regex` |
| 6.8 | REQUIRES_INTERPROCEDURAL_ANALYSIS | `no-polynomial-redos` |

**A07 — Identification and Authentication Failures** (1 missing)
| Score | Detectability | Rule |
|---|---|---|
| 2.7 | REQUIRES_RUNTIME_INFORMATION | `no-session-fixation` |

## If picking up the next batch

Ranked by score alone, ignoring category balance, the next four worth
building are `no-nosql-injection` / `no-server-side-template-injection` /
`no-insert-adjacent-html` / `no-document-write` (80.0 each, all A03). The
last two are the cheapest — same taint kind, same sink family already
registered. (`no-weak-key-size`, 150.0, headed this list and shipped
2026-08-25.)

Ranked by *closing a zero-coverage category* instead, `no-dangerous-url-construction`
(A10, 48.0, statically detectable) is the highest-value single pick: the
only rule that moves a whole category from zero without needing
interprocedural analysis.

Not worth building soon regardless of score: anything marked
`REQUIRES_RUNTIME_INFORMATION` (no-idor-shaped-query, no-missing-csrf-protection,
no-missing-authorization-middleware, no-missing-rate-limiting,
no-session-fixation) — these need information an ESLint rule structurally
cannot have (what an upstream gateway already checked, what a route's
actual authorization policy is), regardless of how important the
vulnerability class is.

## Rules shipped outside this research pass

Three shipped rules aren't in `rule-inventory.yaml` at all —
`no-groq-injection`, `no-elasticsearch-injection`, and
`no-firebase-path-injection` were built from a direct survey of the Kaliber
stack (see "Kaliber-stack gap survey" in `coverage-roadmap.md`), not from
this OWASP-first candidate list. Both processes are legitimate ways to find
a rule worth building; this is why the two documents don't fully overlap
and shouldn't be expected to.
