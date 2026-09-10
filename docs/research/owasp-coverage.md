# OWASP coverage — what's shipped, what's missing

A living tracking document, not a research log (that's `coverage-roadmap.md`).

**Read the caveat before the tables.** The OWASP Top 10 is an awareness
document, and OWASP says so itself: "The OWASP Top Ten lists are awareness
documents, meant to bring awareness to the most critical risks", "The OWASP Top
10 is primarily an awareness document", and if used as a coding or testing
standard "it is the bare minimum and just a starting point"
([Establishing a Modern Application Security Program, Top 10:2025](https://owasp.org/Top10/2025/0x03_2025-Establishing_a_Modern_Application_Security_Program/)).
For verifiable requirements OWASP recommends the Application Security
Verification Standard instead, "as a guide for setting the security
requirements", because ASVS "is designed to be verifiable and tested".

So: **a category with rules next to it in this table is not a category this
plugin covers.** The table says which awareness bucket each shipped rule falls
into, and nothing about how much of that bucket is reachable by a linter — for
several categories the answer is "almost none". Per-rule ASVS 5.0 requirement
references, which *are* verifiable statements, are in each rule's readme.

**A clean `pnpm lint` is not evidence that an application is secure.** It is
evidence that 44 specific weakness patterns were not found in the files that
were linted.

## Coverage against OWASP Top 10:2025

44 rules shipped. Category definitions and CWE mappings taken from the
[2025 edition](https://owasp.org/Top10/2025/) pages themselves; each rule is
placed by the CWE it reports, against that category's own mapped-CWE list.

| Category | Shipped | Why |
|---|---|---|
| [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) | 6 | its mapped CWEs include CWE-22 (path traversal), CWE-601 (open redirect) and CWE-918 (SSRF), which is where SSRF went when the 2021 A10 category was absorbed |
| [A02:2025 – Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) | 3 | mapped CWEs include CWE-611 (XXE), CWE-614 and CWE-1004 (cookie attributes), CWE-942 (permissive cross-domain policy) |
| [A03:2025 – Software Supply Chain Failures](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/) | **0** | structurally out of reach — see below |
| [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) | 12 | "failures related to the lack of cryptography, insufficiently strong cryptography, leaking of cryptographic keys, and related errors"; mapped CWEs include 319, 321, 326, 327, 328, 329, 347 |
| [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) | 12 | mapped CWEs include 79, 83, 89, 94, 95, 116 |
| [A06:2025 – Insecure Design](https://owasp.org/Top10/2025/A06_2025-Insecure_Design/) | **0** | structurally out of reach — see below |
| [A07:2025 – Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/) | 4 | mapped CWEs include CWE-259 and CWE-798 (hard-coded credentials) and **CWE-295 (improper certificate validation)**, which is not in A04:2025 |
| [A08:2025 – Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/) | 1 | mapped CWEs include CWE-502 (deserialization) |
| [A09:2025 – Security Logging and Alerting Failures](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/) | 1 | mapped CWEs include CWE-532 (sensitive information in a log file) |
| [A10:2025 – Mishandling of Exceptional Conditions](https://owasp.org/Top10/2025/A10_2025-Mishandling_of_Exceptional_Conditions/) | **0** | structurally out of reach — see below |
| **not mapped** | 5 | the weakness the rule reports is not in any 2025 category's CWE list |

Categories were not renumbered mechanically from the 2021 table. Three
placements moved as a result, and each is a fact about the 2025 CWE lists
rather than a judgement call:

- **SSRF** was its own category in 2021 (A10). It is not a category in 2025;
  CWE-918 appears in A01:2025's mapped CWEs and is named in its background
  section. `no-ssrf` therefore moves from A10:2021 to A01:2025.
- **Certificate validation** (CWE-295) was cryptographic in 2021 (A02). It is
  **not** in A04:2025's mapped CWEs; it is in A07:2025's.
  `no-node-tls-reject-unauthorized` and `no-disabled-tls-verification` move to
  A07:2025 — a placement that looks wrong until you read the list.
- **XXE** (CWE-611) stays a misconfiguration: A05:2021 → A02:2025.

### The five rules with no 2025 category

Not a gap in the rules; a gap in the mapping, and it is recorded rather than
forced. Each of these reports a CWE that appears in no 2025 category's mapped
list:

| Rule | CWE | |
|---|---|---|
| `no-sensitive-data-in-web-storage` | CWE-922 Insecure Storage of Sensitive Information | absent from A02:2025 and A04:2025 |
| `no-timing-unsafe-secret-comparison` | CWE-208 Observable Timing Discrepancy | absent from A04:2025 and A07:2025 |
| `no-dynamic-require` | CWE-470 Unsafe Reflection | absent from A05:2025 and A08:2025 |
| `no-disabled-security-framework-check` | CWE-1188 Insecure Default | absent from A02:2025 |
| `no-target-blank-without-noopener` | CWE-1022 window.opener Access | absent throughout, and was unmapped in 2021 too |

`no-insecure-cookie-flags` is mapped to A02:2025 on CWE-614 and CWE-1004, but
note that its third CWE — CWE-1275, the SameSite attribute — is in no 2025
category either.

## Expected structural gaps

Three categories are at zero and will stay there. None of them is a backlog
item:

- **A03:2025 Software Supply Chain Failures** is a dependency-version and
  provenance question. It needs a manifest, a lockfile and a vulnerability
  database, not an AST. That is software composition analysis — `npm audit`,
  Dependabot, Snyk. An ESLint rule cannot see a package's installed version.
- **A06:2025 Insecure Design** is about controls that were never designed, not
  code that was written wrongly. There is no syntax for a missing threat model.
  This needs architecture review.
- **A10:2025 Mishandling of Exceptional Conditions** is about what happens at
  runtime when something abnormal occurs — failing open, logic errors under
  error conditions. Whether a catch block fails open is a question about
  semantics and deployed configuration; it needs runtime tests.

The same is true of most of **A01:2025 Broken Access Control** beyond the
traversal/redirect/SSRF slice: "is this authorization check the correct one" is
not a question about syntax, and no rule here pretends otherwise. The six A01
rules cover the mechanical corner of a category whose centre is manual review.

## Shipped, by 2025 category

**A01 — Broken Access Control** (6): `no-client-side-open-redirect`,
`no-firebase-path-injection`, `no-open-redirect`, `no-path-traversal`,
`no-ssrf`, `no-zip-slip`

**A02 — Security Misconfiguration** (3): `no-insecure-cookie-flags`,
`no-permissive-cors`, `no-xxe`

**A04 — Cryptographic Failures** (12): `no-des-3des`, `no-ecb-mode`,
`no-hardcoded-crypto-key`, `no-jwt-alg-none`, `no-jwt-algorithm-confusion`,
`no-jwt-decode-without-verify`, `no-md5`, `no-plain-http-url`,
`no-sha1-for-security`, `no-static-iv`, `no-weak-jwt-secret`,
`no-weak-key-size`

**A05 — Injection** (12): `no-command-injection`,
`no-dangerously-set-inner-html`, `no-dom-xss-sink`,
`no-elasticsearch-injection`, `no-eval`, `no-groq-injection`, `no-inner-html`,
`no-javascript-url`, `no-jquery-html-sink`, `no-shell-true`,
`no-sql-injection`, `no-template-autoescape-disabled`

**A07 — Authentication Failures** (4): `no-disabled-tls-verification`,
`no-hardcoded-api-key`, `no-hardcoded-credentials`,
`no-node-tls-reject-unauthorized`

**A08 — Software or Data Integrity Failures** (1): `no-unsafe-deserialization`

**A09 — Security Logging and Alerting Failures** (1):
`no-authorization-header-log`

**Not mapped** (5): `no-disabled-security-framework-check`,
`no-dynamic-require`, `no-sensitive-data-in-web-storage`,
`no-target-blank-without-noopener`, `no-timing-unsafe-secret-comparison`

## The 2021 edition, for history

Kept because the inventory, most rule readmes and the roadmap below were
written against it, and because consumers still have 2021-shaped compliance
paperwork. It is historical metadata, explicitly versioned; the 2025 table
above is the current one.

| Category (2021) | Shipped | Missing candidates |
|---|---|---|
| A01:2021 – Broken Access Control | 5 | 8 |
| A02:2021 – Cryptographic Failures | 15 | 6 |
| A03:2021 – Injection | 13 | 10 |
| A04:2021 – Insecure Design | **0** | 3 |
| A05:2021 – Security Misconfiguration | 4 | 2 |
| A06:2021 – Vulnerable and Outdated Components | **0** | **0** |
| A07:2021 – Identification and Authentication Failures | 3 | 1 |
| A08:2021 – Software and Data Integrity Failures | 1 | 3 |
| A09:2021 – Security Logging and Monitoring Failures | 1 | 3 |
| A10:2021 – Server-Side Request Forgery (SSRF) | 1 | 2 |

38 candidates in the inventory are not yet shipped. The ranking below is
organised by the 2021 categories, because the inventory's `owasp_top10_2021`
field is what produced it; it has not been re-cut for 2025 because the ranking
is by priority score, which does not change with the edition.

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
