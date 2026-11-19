# Next steps — OWASP coverage effort

Handover checklist as of 2026-08-26, branch `feat/owasp-security`. **44** rules
shipped — this file said 46; the count from `plugin.rules` is 44 (3 committed that
batch: `no-ssrf`, `no-weak-key-size`, `no-zip-slip` — see `coverage-roadmap.md` for
the detail on each). This file is untracked; it is a handover note, not a shipped
document. Not yet pushed/PR'd for this batch —
check whether the existing PR #48 needs updating or a new one is needed.

Everything below was picked by evidence, not generic OWASP score: a sweep of the 60
real `@kaliber/build` projects on this machine (list regenerable via `grep -l
'"@kaliber/build"' */package.json`), excluding `node_modules`/`target`/`www`/`vendor`/
`.kaliber-build`/`.kaliber-eval` noise. Full specs for every rule below are in
`rule-inventory.yaml`.

## To build — real evidence found, not yet shipped

- [ ] **`no-wildcard-postmessage-target`** + **`no-postmessage-without-origin-check`**
  (build together, ship as 2 rule dirs — complementary halves of one weakness)
  Evidence: `Chromabot/src/elements/dependabot.js:38` sends
  `window.postMessage({...}, '*')`; `Chromabot/src/content.js:24` receives it with
  zero `event.origin` check. Verified by direct read.
  Must exclude `BroadcastChannel`/`MessagePort` (same-origin by construction — this
  exact confusion already bit `no-ssrf` once).

- [ ] **`no-log-injection`**
  Evidence: `bol-com-cadeaukaarten/src/api-handler/admin/handleAdmin.js:49` —
  `console.log(\`...${req.method}: ${location.pathname} [${userInfo.nameId}]\`)`,
  unsanitized. Taint-based, reuses the shipped taint layer. Must NOT flag
  structured-field logging (pino/winston's own recommended fix).

- [ ] **`no-unrestricted-file-upload`**
  Evidence: `bol-com-cadeaukaarten`'s `formData.js` calls `formidable()` with zero
  options — no size/type limit, only a post-parse virus scan downstream.
  Matcher rule, no taint needed.

- [ ] **`no-redirect-following-ssrf`**
  Evidence: same fetch population as shipped `no-ssrf` (~15 projects); weaker,
  structural evidence rather than one obviously-exploitable call site. Companion to
  `no-ssrf` — must reuse its sink registry entries and hostname-allowlist sanitizer
  logic, and must never overlap-report with it. Read `no-ssrf/index.js` first.

- [ ] **`no-user-controlled-regexp`**
  Evidence: `kaliber-academie-rinus-vh`'s `Search.js` builds `new RegExp(...)`
  directly from live search input. Cheap, low engineering risk. Skip the MongoDB
  `$regex` sink — zero Mongo/mongoose usage anywhere in the fleet.

Draft agent prompts for all 5 already exist in this conversation's history (each
includes the full spec, exact file references, and required deliverables) — reissue
them as-is once ready to resume.

## Explicitly ruled out — do not build without new evidence

**Zero real hits anywhere in the fleet** (no ORM, no LDAP/XPath/template-engine deps,
Firebase Realtime DB not Firestore, no bcrypt/argon2 anywhere):
`no-nosql-injection`, `no-mass-assignment`, `no-ldap-injection`, `no-xpath-injection`,
`no-server-side-template-injection`, `no-expression-language-injection`,
`no-weak-password-hashing`, `no-unsalted-password-hash`, `no-secret-in-log`,
`no-request-body-log`, `no-predictable-token`, `no-insecure-random`,
`no-user-controlled-authorization-bypass`, `no-polynomial-redos`,
`no-arbitrary-file-read`, `no-reflected-xss`, `no-insecure-temp-file`.

**False-signal risk** — real hits exist, but they're already-safe/idiomatic code;
building these now would misfire and burn trust:
`no-dangerous-dynamic-property-access` (guarded lookup tables), `no-insecure-websocket`
(already scheme-aware config), `no-client-side-only-authorization` (server-verified
elsewhere), `no-dangerous-url-construction` (not attacker-input-driven),
`no-arbitrary-file-write` (already `path.basename`-guarded).

**Permanently out of scope** — need runtime information a static linter can't have,
regardless of stack fit: `no-idor-shaped-query`, `no-missing-csrf-protection`,
`no-missing-rate-limiting`, `no-session-fixation`, `no-missing-authorization-middleware`.

**Also two `REQUIRES_INTERPROCEDURAL_ANALYSIS` candidates ruled out this round** for
zero evidence rather than engine limits (`no-arbitrary-file-read`, `no-reflected-xss`,
listed above) — worth re-checking if the fleet's shape changes, since the engine can
now handle same-file and one-hop cross-file interprocedural cases (see `no-ssrf`'s
`callArguments` work).

## When the list above reaches zero

Per the original ask ("keep going until we have had all rules that apply to the
Kaliber stack"), once the 5 items above ship, the backlog is at zero real-evidence
candidates — re-run the stack-relevance sweep only if the fleet changes (new
dependencies adopted, new projects added) rather than reopening the ruled-out list
from memory.
