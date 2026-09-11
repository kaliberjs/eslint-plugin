# Competitive analysis — JS/TS security static analysis

Research artifact for `@kaliber/eslint-plugin`'s security subsystem.

| | |
|---|---|
| Date of research | 2026-08-24 |
| Method | Primary sources fetched live: repo `LICENSE` files, published npm tarballs, GitHub REST/git-tree API, vendor documentation, issue trackers |
| Hard constraint observed | No rule implementations or proprietary rule content copied. Sources read as architectural reference only; techniques described in own words |
| Unverifiable claims | Marked `UNVERIFIED` inline and collected in [Appendix B](#appendix-b--unverified-claims) |

---

## 0. Taint capability ladder

Used consistently below. This is the axis that matters for our design, and it is the axis
vendors are loosest about.

| Level | Definition | What it can actually see |
|---|---|---|
| **none** | Single-node or fixed-shape AST match. No value provenance. | `eval(x)` is reported because the callee is `eval`, regardless of `x` |
| **literal-ness back-trace** | Resolves an identifier to its initialiser and asks "is this a compile-time constant?" Reports when it is *not*. | `fs.readFile(p)` where `p` is any non-literal |
| **intra-procedural** | Real taint propagation, but only within one function body. | source → assignment → sink, same function |
| **inter-procedural (intra-file)** | Propagates across calls to functions defined in the same file. | source in handler → helper in same file → sink |
| **inter-file** | Propagates across module boundaries; needs a whole-project graph. | source in `routes.js` → helper in `sanitize.js` → sink in `render.js` |

A **literal-ness back-trace is not taint tracking.** It answers the inverse question, and its
answer set ("not provably constant") is far larger than "attacker-controlled". This distinction
accounts for most of the noise documented in [§13](#13--what-not-to-do).

---

## 1. Comparison matrix

| Tool | JS/TS rules | Taint level | Framework knowledge encoded as | User-extensible sources/sinks/sanitizers | Runs where | Engine licence | Rule licence |
|---|---|---|---|---|---|---|---|
| eslint-plugin-security | 14 | literal-ness back-trace | hardcoded arrays + 1 JSON table | no | ESLint, per file | Apache-2.0 | Apache-2.0 |
| eslint-plugin-no-unsanitized | 2 | literal-ness back-trace (const/let string literals) | hardcoded sink + escaper names | yes, per-rule options | ESLint, per file | MPL-2.0 | MPL-2.0 |
| eslint-plugin-xss | 2 | intra-procedural over **identifier names** | name regexes + per-function signature table | yes, per-rule options | ESLint, per file | ISC per npm; no `LICENSE` in repo | same |
| @microsoft/eslint-plugin-sdl | 17 | none | config presets, one per framework | no | ESLint, per file | MIT (**archived**) | MIT |
| Semgrep CE (OSS) | 173 JS + 30 TS rule *files* | intra-procedural, single-function | YAML tree, one dir per technology (39 JS dirs) | yes — `pattern-sources`/`-sinks`/`-sanitizers` | separate process | LGPL-2.1 | **Semgrep Rules License v1.0** |
| Semgrep Pro | same registry | inter-procedural + **inter-file** | same | same | separate process / cloud | proprietary | Semgrep Rules License v1.0 |
| CodeQL (JS/TS) | 823 `.ql` in `javascript/ql`, 101 under `src/Security` | **inter-file**, whole-program | QL class hierarchy + 32 `.model.yml` (models-as-data) | yes — `.model.yml` tuples, no QL needed | DB build then query | **GitHub CodeQL Terms** (restrictive) | MIT |
| eslint-plugin-sonarjs | 293 | none (AST + CFG; 71 rules type-aware) | hardcoded in analyser | no | ESLint, per file | see §7 — **SSAL v1.0 in tarball** | same |
| SonarQube JS/TS analyser | 526 JS / 544 TS | **inter-file** (injection rules) | hardcoded in analyser | no | server, full project | commercial (Developer Edition+) | proprietary |
| Snyk Code | `UNVERIFIED` | **inter-file** | internal; ~70 curated JS libs | **no** (custom rules are IaC-only) | cloud / CLI upload | proprietary | proprietary |
| Bearer | 100 JS rule files | intra-procedural detector composition | YAML tree, one dir per framework | yes — `--external-rule-dir`, same YAML format | Go binary, whole repo | Elastic License 2.0 | Elastic License 2.0 |
| njsscan | 68 semantic + 2 pattern YAML | inherits Semgrep CE → single-function | YAML tree by vuln class | not by design | Python + Semgrep subprocess | LGPL-3.0 | LGPL-3.0 |
| typescript-eslint | 135 rule files (~22 security-relevant) | no taint; **inter-file type propagation** via TS checker | none | per-rule options; public parser-services API | ESLint, per file + TS program | MIT | MIT |

Adoption context (npm, last week, fetched 2026-08-24):

| Package | Downloads/week | Latest | Published |
|---|---|---|---|
| `typescript-eslint` | 87,998,139 | 8.67.0 | — |
| `eslint-plugin-security` | 3,986,590 | 4.0.1 | 2026-06-12 |
| `eslint-plugin-sonarjs` | 3,791,933 | 4.2.0 | 2026-07-14 |
| `@microsoft/eslint-plugin-sdl` | 1,570,583 | 1.1.0 | 2025-02-18 (repo archived) |
| `eslint-plugin-no-unsanitized` | 954,490 | 4.1.5 | 2026-02-19 |
| `eslint-plugin-xss` | 29,413 | 0.1.12 | 2022-06-27 |

---

## 2. eslint-plugin-security

**Repo** `eslint-community/eslint-plugin-security` · 2371 stars · 21 open issues · Apache-2.0 · v4.0.1

### Detection capabilities

Exactly **14 rules**, all fourteen enabled at `warn` in the single `recommended` config
(verified from `index.js`):

`detect-bidi-characters`, `detect-buffer-noassert`, `detect-child-process`,
`detect-disable-mustache-escape`, `detect-eval-with-expression`, `detect-new-buffer`,
`detect-no-csrf-before-method-override`, `detect-non-literal-fs-filename`,
`detect-non-literal-regexp`, `detect-non-literal-require`, `detect-object-injection`,
`detect-possible-timing-attacks`, `detect-pseudoRandomBytes`, `detect-unsafe-regex`.

A vestigial `rulesConfig` map sets every rule to `0`; it is legacy dead config and has no effect
on the flat `recommended` config.

### Taint capabilities — **literal-ness back-trace, no taint**

There are exactly two shared helpers in `utils/`:

- `import-utils.js` → `getImportAccessPath({ node, scope, packageNames })`. Walks an identifier
  back through ESLint scope analysis to a `require()` or `import` of a named package, handling
  aliases, destructuring with rename, namespace imports, and one level of member access
  (`require('fs').promises`). Cycle-guarded with a `Set`. **This is genuinely good and is the
  one idea in the plugin worth adopting.**
- `is-static-expression.js` → recursive "is this expression a compile-time constant?" Handles
  `Literal`, `TemplateLiteral` (static iff all interpolations static), `BinaryExpression` (static
  iff both operands static), and `Identifier` resolved to a single-definition variable. Carries
  an allowlist of `path.*` constructors (`join`, `resolve`, `normalize`, `basename`, …), `url`
  module members, `__dirname`/`__filename`, and `import.meta.{url,dirname,filename}`.
  `WeakMap`-cached per node.

There is **no source model, no sanitizer model, and no propagation**. A rule fires when an
argument at a known index is *not provably static*. Sink argument positions for `fs` live in
`utils/data/fsFunctionData.json` — the only data-driven part of the plugin.

`detect-object-injection` does not even use these helpers. Its entire body visits
`MemberExpression`, checks `node.computed === true && node.property.type === 'Identifier'`, and
selects one of three messages from `node.parent.type`. It has no `meta.schema`.

### Framework awareness

Hardcoded string arrays inside each rule file, e.g. the fs rule's
`['fs', 'node:fs', 'fs/promises', 'node:fs/promises', 'fs-extra']`. There is no registry, no
shared model, and no way to add a framework without forking.

### Extensibility

**None.** No rule accepts sources, sinks, or sanitizers as options.

### False-positive reputation — the canonical case

| Evidence | Detail |
|---|---|
| [Issue #21](https://github.com/eslint-community/eslint-plugin-security/issues/21) "A more relevant detect-object-injection" | **Open since 2017-08-30**, 20 comments, 12 reactions. "I can't think of a relevant security use case where Object injection would be relevant outside of the scope of a function directly linked to a web service." |
| [Issue #22](https://github.com/eslint-community/eslint-plugin-security/issues/22) | Open since 2017. "`detect-object-injection`. As this test is currently designed, it's completely overwhelming" … "I really want to use this plugin to easily catch minor security issues, but as is, i can't imagine it doing anything more than frustrate people" |
| [Issue #67](https://github.com/eslint-community/eslint-plugin-security/issues/67) | Proposed exactly the light static-value heuristics that would fix it. **Closed without landing them.** |
| Issues [#124](https://github.com/eslint-community/eslint-plugin-security/issues/124), [#126](https://github.com/eslint-community/eslint-plugin-security/issues/126), [#136](https://github.com/eslint-community/eslint-plugin-security/issues/136) | Individual FP reports: switch-case discriminant; type-safe key; generic FP |
| [GitLab issue 351399](https://gitlab.com/gitlab-org/gitlab/-/issues/351399) — "Remove high-FP-rate `detect-object-injection` eslint and semgrep rule" | GitLab removed it from **both** their ESLint and Semgrep rulesets, citing "a significant amount of false positives" and that it "matches on almost every access to an object's properties via `[]` notation" |
| Issue #22 item 1 | `detect-non-literal-fs-filename` reports `jsonFile.readFile` **with the message text `fs.readFile`** — the diagnostic misdescribes the user's code |
| Issue #22 item 2 | `${process.cwd()}/path/to/json` reported as a path-traversal risk |

Third-party benchmark ([Peretz, "The False Positive Tax"](https://ofriperetz.dev/articles/eslint-security-fn-fp-benchmark)) — a published experience report, not a primary vendor source; small fixture suite (40 vulnerable / 38 safe patterns, 14 OWASP/CWE categories), v2.1.1 on ESLint 8.57:

| Metric | Value |
|---|---|
| True positives | 11 / 40 |
| False positives | 11 |
| False negatives | 29 |
| Precision | 50.0 % |
| Recall | 27.5 % |
| `detect-object-injection` share of all FPs | 8 of 11 (73 %); that rule alone ≈ 20 % precision |
| Zero detections in | SQL injection, hardcoded credentials, JWT attacks, weak crypto, NoSQL injection, SSRF, open redirect |

Treat the absolute numbers as indicative of shape, not as a measured population rate. The
direction is corroborated independently by the issue tracker and by GitLab.

### Performance

Negligible. Pure AST visitors, no type information, `WeakMap` caching on the static-expression
check. This is the cost profile we must match.

### Licensing

`LICENSE` = Apache License 2.0; npm `license` field = `Apache-2.0`. **Consistent.** Engine and
rules are the same artifact under the same licence.

**What we may reuse:** Apache-2.0 permits reuse in an MIT-licensed project provided we retain the
copyright notice, the licence text, and a `NOTICE` of modifications for anything copied.
**What we will do:** copy nothing. Read `import-utils.js` and `is-static-expression.js` as
architectural reference and implement provenance resolution independently in
`machinery/security/`.

---

## 3. eslint-plugin-no-unsanitized (Mozilla)

**Repo** `mozilla/eslint-plugin-no-unsanitized` · 247 stars · MPL-2.0 · v4.1.5 (2026-02-19)

### Detection capabilities

**2 rules**, both shipped in `configs.recommended`:

- `method` — dangerous *calls*: `insertAdjacentHTML`, `document.write`, `document.writeln`
- `property` — dangerous *assignments*: `innerHTML`, `outerHTML`

Narrow by design. "This plugin is built for and used within Mozilla to maintain and improve the
security of our products and services."

### Taint capabilities — **literal-ness back-trace, deliberately minimal**

Documented as "Variable Tracing": "backtracing will only allow `const` and `let` variables that
contain string literals only. Further assignments to these variables will also be checked."
Disableable with `variableTracing: false`. Not taint tracking; the same inverse question
eslint-plugin-security asks, with a narrower accepted set.

### Sanitizer model — **the best idea in the field**

The escaper must be a **tagged template**:

```js
bar.innerHTML = escapeHTML`<a href='${url}'>About</a>`   // accepted
foo.innerHTML = input.value                              // reported
```

Default accepted escapers are hardcoded as `Sanitizer.escapeHTML` and `escapeHTML`; `.setHTML()`
(Sanitizer API) is allowed by default. Configurable via `escape.taggedTemplates`.

Why this matters: a tagged template forces the escaping to apply to the **interpolations**, not
to an already-concatenated string. `escapeHtml('<b>' + userInput + '</b>')` — the classic
sanitize-too-late bug — is *unrepresentable* in this form. The correct ordering becomes structural
instead of something the analysis has to prove.

### Extensibility — real, but per-rule

Two-element options array (`SCHEMA.md`):

```js
'no-unsanitized/method': ['error',
  { disableDefault: true, escape: { taggedTemplates: ['safeHTML'] } },  // escaper config
  { html: { properties: [0] } }                                         // extra sinks
]
// object-scoped sink:
{ innerHTML: { objectMatches: ['document.*'] } }
```

Genuine user extension of both the sink list and the escaper list, including full override of the
defaults. But it is per-rule string/regex configuration, not a shared registry — two rules cannot
share a sanitizer definition.

### False-positive reputation

Good, and by construction: two sinks, hard escaper requirement. The cost is **false negatives and
practical friction** — any indirection (a helper returning HTML, a variable holding a non-literal)
is reported. Mozilla accepts that because their codebase follows the `escapeHTML` convention.
Projects that build markup in helpers will see this as noise.

### Performance

Negligible. Pure AST, bounded back-trace.

### Licensing

`LICENSE` = MPL-2.0; npm `license` = `MPL-2.0`. **Consistent.**

**MPL-2.0 is file-level copyleft.** Copying any file — or a recognisable portion of one — into
`@kaliber/eslint-plugin` makes *that file* MPL-2.0 and obliges us to publish its source under
MPL-2.0 and mark it. Mixing MPL files into an MIT package is legal but creates a per-file licence
patchwork we do not want in a published plugin.

**Conclusion: copy nothing.** The tagged-template-escaper *technique* is an idea, not code, and
ideas are not covered. Reimplement.

---

## 4. eslint-plugin-xss

**Repo** `Rantanen/eslint-plugin-xss` · 72 stars · npm `license: ISC`, **no `LICENSE` file in the
repo** (GitHub reports `NOASSERTION`) · v0.1.12 published **2022-06-27**, repo last pushed
2023-08-29.

**Effectively dead.** `lib/rules/no-mixed-html.js` uses the legacy
`module.exports = function(context) {...}` rule format, which ESLint 9 removed. It cannot run on
ESLint 9/10 without a compatibility shim. Included here because it is the clearest available
specimen of an anti-pattern we must not repeat.

### Detection capabilities

**2 rules**: `no-mixed-html`, `no-location-href-assign`.

### Taint capabilities — intra-procedural, over **identifier names**

`no-mixed-html` maintains an expression stack and propagates an "is HTML" bit through
concatenations, ternaries, array `.join`, and function returns. That is real intra-procedural
propagation. The problem is where the *type* comes from — the source, verified from the rule body:

```js
var htmlVariableRules = [ 'html/i' ]     // default
var htmlFunctionRules = [ 'AsHtml' ]     // default
```

**A variable is HTML-typed iff its name matches `/html/i`.** Both failure directions follow
immediately: a variable legitimately named `html` holding safe static markup is reported; the same
markup in `markup` or `content` is invisible.

### Second failure mode: unknown calls are assumed safe

The default passthrough table is only `.join`, `.toString`, `.substr`, `.substring`. Any call not
declared `passthrough` is treated as producing encoded output. Hence the docs' own example:

```js
var html = '<div>' + encode( input ) + '</div>';   // accepted
```

Nothing about `encode` is modelled. `attackerControlled(input)` would be accepted identically.
This is the *exact* prohibition already written into our `AGENTS.md`: "A function is never a
sanitizer because it is *named* `sanitize`, `clean`, `escape`, or `validate`." Here it is worse —
a function is a sanitizer because it is a *function*.

### Extensibility — architecturally interesting, semantically wrong

```js
'xss/no-mixed-html': [2, {
  htmlVariableRules: ['AsHtml', 'HtmlEncoded/i', '^html$'],
  htmlFunctionRules: ['.asHtml/i', 'toHtml'],
  functions: {
    '$':      { htmlInput: true, safe: ['document', 'this'] },
    '.html':  { htmlInput: true, htmlOutput: true },
    '.join':  { passthrough: { obj: true, args: true } },
  },
}]
```

The **per-function signature table** — `htmlInput` / `htmlOutput` / `passthrough` / `safe` — is a
real flow-summary vocabulary, and closely analogous to CodeQL's `summaryModel`. The `safe`
allowlist keyed on argument identifier (`$(document)`, `$(this)`) is a pragmatic touch. The
architecture is salvageable; the name-based typing is not.

### False-positive reputation

Bad in both directions, by construction. No issue-tracker corpus worth citing (72 stars,
abandoned). `UNVERIFIED` as to field-reported rates.

### Performance

Negligible.

### Licensing

npm metadata says `ISC`; the repository has **no LICENSE file**. Provenance is therefore weak.
**Do not reuse anything.** Read the options schema as a design specimen only.

---

## 5. @microsoft/eslint-plugin-sdl

**Repo** `microsoft/eslint-plugin-sdl` · 52 stars · MIT · **archived**. README carries a
`> [!WARNING]` block: "This project is no longer actively maintained." Latest npm 1.1.0
(2025-02-18) — yet **1.57 M downloads/week**.

### Detection capabilities

**17 rules**, framework-partitioned:

| Area | Rules |
|---|---|
| DOM XSS | `no-inner-html`, `no-document-write`, `no-html-method`, `no-msapp-exec-unsafe`, `no-winjs-html-unsafe` |
| Angular / AngularJS | `no-angular-bypass-sanitizer`, `no-angular-sanitization-trusted-urls`, `no-angularjs-bypass-sce`, `no-angularjs-enable-svg`, `no-angularjs-sanitization-whitelist` |
| Transport / origin | `no-insecure-url`, `no-postmessage-star-origin`, `no-document-domain`, `no-cookies` |
| Crypto / memory | `no-insecure-random`, `no-unsafe-alloc` |
| Electron | `no-electron-node-integration` |

### Taint capabilities — **none**

Fixed-shape AST matching on specific known-dangerous APIs. No provenance, no propagation, no
sanitizer model.

### Framework awareness — encoded as *config presets*

Nine shareable configs: `angular`, `angularjs`, `common`, `electron`, `node`, `react`,
`typescript`, plus `recommended` and `required`. Framework knowledge lives in **which rules a
config turns on**, not in an analysis model.

This is the cheapest possible framework story and it is honest about it. It also implies a hard
ceiling: it can only ever ban APIs, never reason about data reaching them.

### Extensibility

None for sources/sinks/sanitizers. Some rules take allowlists (`UNVERIFIED` per rule).

### False-positive reputation

Low noise by construction — an API ban has essentially no FP surface beyond "we intentionally use
`document.write` here". The documented complaint against SDL is *coverage*, not noise. That is
the correct trade for what it is.

### Performance

Negligible.

### Licensing

MIT, repo and npm consistent. Legally the most reusable artifact in this survey.

**What we may reuse:** anything, with attribution. **What we will do:** nothing directly. The one
genuinely valuable artifact is the *taxonomy* — which specific APIs, per framework, are
categorically unsafe — and that is public security knowledge documented by MDN, Angular, and
Electron independently. Cite those, not the plugin.

### The strategic signal

An **archived** MIT plugin with **1.57 M weekly downloads** is direct evidence that this market
rewards distribution and config ergonomics over analytical depth — and that a maintained,
framework-aware replacement has an open lane.

---

## 6. Semgrep (CE / OSS and Pro)

**Repo** `semgrep/semgrep` · 16,369 stars · engine **LGPL-2.1** · registry rules
`semgrep/semgrep-rules` under **Semgrep Rules License v1.0**.

### Detection capabilities

Rule *files* in `semgrep/semgrep-rules@develop` (git tree, not truncated):

| Path | YAML rule files |
|---|---|
| `javascript/` | **173** |
| `typescript/` | **30** |

Lower bounds — one YAML file may declare multiple rules. Organisation is one directory per
technology; the JS tree has **39**: `ajv`, `angular`, `apollo`, `argon2`, `audit`, `aws-lambda`,
`bluebird`, `browser`, `chrome-remote-interface`, `deno`, `express`, `fbjs`, `grpc`, `intercom`,
`jose`, `jquery`, `jsonwebtoken`, `jwt-simple`, `lang`, `monaco-editor`, `node-crypto`,
`node-expat`, `passport-jwt`, `phantom`, `playwright`, `puppeteer`, `react`, `sandbox`, `sax`,
`sequelize`, `serialize-javascript`, `shelljs`, `thenify`, `vm2`, `vue`, `wkhtmltoimage`,
`wkhtmltopdf`, `xml2json`.

### Taint capabilities — **CE is single-function. This is the biggest gap between marketing and reality in the field.**

Four YAML operators for `mode: taint`:

| Key | Required | Availability |
|---|---|---|
| `pattern-sources` | required | CE |
| `pattern-sinks` | optional | CE |
| `pattern-sanitizers` | optional | CE |
| `pattern-propagators` | optional | **Pro** |

Vendor statements, quoted:

> "By design, Semgrep open source software, Semgrep Community Edition (CE) can only analyze
> interactions within a single function."

> "Taint propagators only work intraprocedurally, that is, within a function or method."

> "Cross-function analysis finds patterns within a single file spanning code blocks and
> functions." — Pro

> "Cross-file analysis finds patterns spanning multiple files within a project…" — Pro,
> `--pro` + `interfile: true`

So: CE = **intra-procedural**. Pro adds inter-procedural (still intra-file) and inter-file.
Field/index sensitivity is not documented (`UNVERIFIED`).

**Concrete proof of the gap.** The flagship Express XSS taint rule shipped in the *public*
registry, `javascript/express/security/audit/xss/direct-response-write.yaml`, declares:

```yaml
options:
  interfile: true
metadata:
  interfile: true
```

The rule that a reader would take as evidence of Semgrep's XSS taint tracking is authored for the
Pro interfile engine. Run the public registry on CE and you get whatever single-function analysis
can see.

**How the same rule copes without inter-procedural analysis** — worth studying, and worth *not*
copying wholesale:

```yaml
mode: taint
pattern-sources:
  - patterns:
      - pattern-either:
          - pattern-inside: function ... ($REQ, $RES) {...}
          - pattern-inside: $APP.$METHOD(..., function $FUNC($REQ, $RES) {...})
            # with metavariable-regex on $METHOD: ^(get|post|put|head|delete|options)
      - pattern-not-inside: |
          function ... ($REQ, $RES) { ... $RES.$SET('Content-Type', '$TYPE') }
```

Two techniques:

1. **Syntactic containment as a source proxy.** "We are lexically inside something shaped like an
   Express route handler, therefore its parameters are sources." Gated on the *shape* of the
   enclosing construct plus a regex on the HTTP method name — not on arity alone.
2. **`pattern-not-inside` as a barrier.** Setting `Content-Type` anywhere in the handler
   suppresses the finding. Coarse — a barrier that is not on the flow path — but cheap and
   effective at cutting noise.

### Framework awareness

Per-rule YAML with `metadata.technology: [express]`, located in a technology directory. There is
**no shared library model** — source and sink knowledge is re-declared in every rule that needs
it. Semgrep's extensibility comes at the cost of duplication; CodeQL's models-as-data is the
opposite trade.

### Extensibility — best-documented in the field

Users write their own YAML with the same four keys. No engine changes, no compilation, no plugin
API. Custom `pattern-propagators` require Pro.

### False-positive reputation

Rule-dependent, and Semgrep manages it structurally rather than by claiming precision:

- Every registry rule carries `confidence`, `likelihood`, `impact`, `category`, `subcategory` in
  `metadata`. Confidence is separate from severity — the same split our `finding.js` already
  mandates.
- The registry separates a `security/audit/` tier (noisier, auditor-facing) from
  higher-confidence rules, and ships them as separate rulesets.

GitLab dropped Semgrep's object-injection rule alongside the ESLint one
([issue 351399](https://gitlab.com/gitlab-org/gitlab/-/issues/351399)) — a reminder that the
YAML DSL does not by itself make a rule precise.

### Performance

Separate process; not per-keystroke. Per-file `--timeout` defaults to 5 s, retried 3× before the
file is skipped (`--timeout-threshold`). Published averages: CI diff scans just under ~10 s, full
scans ~20 s on the OSS engine; v1.124 claimed up to 3× improvements. Minified JS is a known
pathology. Pro interfile is materially slower — it builds a whole-project graph.

### Licensing — **two licences, and the rules one is the binding constraint**

Engine: LGPL-2.1 (`semgrep/semgrep/LICENSE` is the GNU LGPL v2.1 text; GitHub reports
`LGPL-2.1`).

Rules: `semgrep/semgrep-rules/LICENSE` is a single line pointing at
`semgrep.dev/legal/rules-license`. Verbatim key terms (Semgrep Rules License v1.0, last updated
2024-12-13):

> "The licensor grants you a non-exclusive, royalty-free, worldwide, non-sublicensable,
> non-transferable license to use the rules, subject to the limitations and conditions below."

> "**You may use the rules only for your own internal business purposes. This license does not
> allow you to distribute the rules, or to make them available to others as a service.**"

> "If you modify the rules, you must include in any modified copies of the rules prominent notices
> stating that you have modified the rules."

Plus a patent-termination clause: asserting patent infringement against the rules or any Semgrep
product terminates the patent licence immediately.

| | |
|---|---|
| **May we use Semgrep CE on our own code?** | Yes — LGPL-2.1 engine, and the rules for internal business purposes |
| **May we vendor, port, or translate registry rules into `@kaliber/eslint-plugin`?** | **No.** Publishing an npm package is distribution, and the licence explicitly prohibits distributing the rules |
| **Does a mechanical translation escape it?** | No. A translation of a rule's source/sink/sanitizer lists is a derivative of the rule content and its distribution is equally prohibited |
| **May we adopt the `pattern-sources`/`-sinks`/`-sanitizers`/`-propagators` *vocabulary*?** | Yes. Key names and the idea of separating taint config from pattern syntax are not rule content |

---

## 7. CodeQL (JS/TS libraries)

**Repo** `github/codeql` · queries + libraries **MIT** · CLI/engine
`github/codeql-cli-binaries` under **GitHub CodeQL Terms and Conditions**.

### Detection capabilities

Counts from the git tree of `main:javascript/ql` (not truncated):

| Artifact | Count |
|---|---|
| `.ql` query files | **823** |
| `.ql` under `src/Security` | **101** |
| `.model.yml` (models-as-data) | **32** |
| files under `lib/ext` | **27** |

Docs state **36 frameworks and libraries** explicitly modelled for JS/TS: Express, Fastify, Hapi,
Koa, Nest.js, Restify, Sails.js; Angular, AngularJS, React, React Native, Vue; EJS, Handlebars,
Hogan, Mustache, Nunjucks, Swig; MongoDB, MSSQL, MySQL, Postgres, SQLite3, Sequelize; Axios,
Request, Superagent, Socket.io; jQuery, Lodash, Ramda, Underscore; Browser, Electron, Node; AWS
Lambda, Vercel.

### Taint capabilities — **inter-file, whole-program**

> "CodeQL analysis consists of three steps: 1. Preparing the code, by creating a CodeQL
> database 2. Running CodeQL queries against the database 3. Interpreting the query results."

The database holds "a full, hierarchical representation of the code, including a representation of
the abstract syntax tree, the data flow graph, and the control flow graph." Nothing runs per file;
nothing runs without extraction.

### Framework knowledge — **two layers, and the second is the one to steal**

**Layer 1 — QL class hierarchy.** Framework support lives in `semmle.javascript.frameworks.*`.
The HTTP module models `ServerDefinition`, `RouteHandler`, `RequestInputAccess`, `ResponseExpr`,
`HeaderDefinition` across "Express, the standard Node.js `http` and `https` modules, Connect, Koa,
Hapi and Restify". A taint analysis is a module implementing `DataFlow::ConfigSig`:

| Predicate | Role |
|---|---|
| `isSource()` | where tracking begins |
| `isSink()` | where it must not arrive |
| `isBarrier()` | sanitizers / barriers that stop flow |
| `isAdditionalFlowStep()` | custom propagation |

instantiated as `DataFlow::Global<...>`.

**Layer 2 — models-as-data.** Library behaviour is added as **YAML tuples**, no QL:

```yaml
extensions:
  - addsTo:
      pack: codeql/javascript-all
      extensible: summaryModel
    data:
      - ["global", "Member[decodeURIComponent]", "Argument[0]", "ReturnValue", "taint"]
```

Extensible predicates:

| Predicate | Columns |
|---|---|
| `sourceModel` | type, path, kind |
| `sinkModel` | type, path, kind |
| `summaryModel` | type, path, input, output, kind |
| `typeModel` | type1, type2, path |
| `barrierModel` | type, path, kind |
| `barrierGuardModel` | type, path, acceptingValue, kind |

Access paths compose left-to-right from `Member[name]`, `Argument[n]`, `Parameter[n]`,
`ReturnValue`, and `Fuzzy`. First column is a package name, a qualified type, or `global`. `kind`
carries the taint flavour (`remote`, `sql-injection`, `taint`, `value`, …).

**The property that matters for us:** adding a library's behaviour is a *data edit*, and the
analysis engine never changes. `barrierGuardModel` is the piece almost nobody else has — a
sanitizer that only holds on the branch where a check succeeded.

### Extensibility

Excellent, and the model we should copy: a user drops a `.model.yml` into a CodeQL pack. No
query language required.

### False-positive reputation

Best of the tools whose internals are visible, and for structural reasons — barriers and barrier
guards are first-class, models are precise per access path, and flow paths are reported so a
reviewer can dismiss quickly. The cost is setup, runtime, and that it is not an editor-time tool.

### Performance

DB extraction then query evaluation: minutes, not milliseconds. Extraction for JS "runs directly
on the source code" (no build interception needed), which is the cheap end for CodeQL and still
orders of magnitude away from a lint pass. No published per-project figures in the overview docs
(`UNVERIFIED`).

### Licensing — **read this twice**

| Artifact | Licence |
|---|---|
| Queries, libraries, `.model.yml` (`github/codeql`) | **MIT** |
| CLI + engine (`github/codeql-cli-binaries`) | **GitHub CodeQL Terms and Conditions** |

The repo README is explicit:

> "The code in this repository is licensed under the MIT License by GitHub. The CodeQL CLI
> (including the CodeQL engine) is hosted in a different repository and is licensed separately. If
> you'd like to use the CodeQL CLI to analyze closed-source code, you will need a separate
> commercial license."

CodeQL Terms, verbatim. **Permitted:** academic research; demonstrating the Software; testing
CodeQL queries released under an OSI-approved licence. And, *only with an "Open Source
Codebase"* (a codebase released under an OSI-approved licence): performing analysis, and
generating databases in CI/CD if hosted on GitHub.com.

**Restricted:**

> "To otherwise or in any other context generate any CodeQL database for or during automated
> analysis, CI or CD, whether as part of normal engineering processes or another context."

> "To otherwise or in any other context use the Software in connection with any codebase that is
> not an Open Source Codebase (e.g., code in a private repo in GitHub)."

Waived only "if your use of the Software is under a paid customer license for GitHub Advanced
Security."

| Question | Answer |
|---|---|
| May we read the `.ql` / `.qll` / `.model.yml` sources? | Yes — MIT |
| May we reuse the models-as-data *tuples*? | Legally yes under MIT with attribution + licence text. **We will not** — project constraint is to describe techniques, not copy rule content |
| May we run the CodeQL CLI on a client's private repo to validate our rules? | **No**, not without paid GHAS. CodeQL is therefore **unavailable as a validation oracle** for private test corpora |
| May we run it on our own OSS repo? | Yes — `@kaliber/eslint-plugin` is MIT, so it qualifies as an Open Source Codebase |

That last row is an operational constraint on our own test strategy, not just a legal footnote:
our differential-testing corpus must be OSS, or built in-house.

---

## 8. SonarJS / SonarQube

Two products with two different capability levels. **The taint claim belongs to the server, not
to the ESLint plugin** — and this is routinely conflated.

### 8a. `eslint-plugin-sonarjs` (the ESLint plugin)

v4.2.0 (2026-07-14) · 3.79 M downloads/week · **293 rules** (counted from the generated rules
table in its README).

Rule metadata distribution, counted from the same table:

| Marker | Count | Share |
|---|---|---|
| ✅ in `recommended` | 230 | 78 % |
| 💭 requires type information | 71 | 24 % |
| 💡 manually fixable (suggestion) | 38 | 13 % |
| 🔧 **autofixable** | **6** | **2 %** |

Six autofixes out of 293 rules. That is the quickfix conservatism worth imitating, quantified.

Security-adjacent rules present (extracted from the table): `code-eval`, `os-command`,
`no-os-command-from-path`, `sql-queries`, `no-hardcoded-passwords`, `no-hardcoded-secrets`,
`hardcoded-secret-signatures`, `insecure-cookie`, `cookie-no-httponly`,
`no-session-cookies-on-static-assets`, `cors`, `csrf`, `dompurify-unsafe-config`,
`encryption-secure-mode`, `hashing`, `pseudo-random`, `no-weak-cipher`, `no-weak-keys`,
`weak-ssl`, `unverified-certificate`, `no-clear-text-protocols`, `xml-parser-xxe`,
`no-unsafe-unzip`, `file-permissions`, `hidden-files`, `no-intrusive-permissions`,
`no-mixed-content`, `frame-ancestors`, `no-mime-sniff`, `no-referrer-policy`,
`web-sql-database`, `insecure-jwt-token`, `aws-s3-bucket-insecure-http`, plus a large ReDoS family
(`super-linear-regex`, `slow-regex`, `regex-complexity`, `stateful-regex`, `no-control-regex`,
`no-invalid-regexp`, `no-regex-spaces`, `unicode-aware-regex`, `concise-regex`,
`anchor-precedence`).

**Note what is absent: no XSS-injection rule, no taint-based SQLi, no path traversal, no SSRF.**
Those are the taint rules, and they are not in the plugin. Its own README says so:

> "This ESLint plugin does not contain all the rules from the SonarQube JS/TS analyzer."

**Taint level: none.** Pattern matching plus control-flow analysis, with type information via
`@typescript-eslint/parser` for 71 rules.

### 8b. SonarQube JS/TS analyser (the server)

**526 JS rules and 544 TS rules** (SonarJS repo README). Features listed: "Advanced rules based on
pattern matching and control flow analysis", "React JSX, Flow, Vue, and AWS lambda functions
support".

**Taint level: inter-file, commercial.** Requires SonarQube Cloud or **SonarQube Server Developer
Edition or higher, 8.9+**. The IDE integration can only surface injection findings in connected
mode after a full project analysis, because — Sonar's own explanation —

> "injection vulnerabilities (i.e., taint vulnerabilities) often involve code in multiple files and
> functions"

so SonarQube for IDE "can only raise them after a full project analysis."

### Framework awareness

Hardcoded in the analyser (React/JSX, Vue, Flow, AWS Lambda). Not user-extensible as data.

### Extensibility

None for taint sources/sinks/sanitizers in either product. Per-rule options only.

### Performance

The ESLint plugin's 71 type-aware rules carry the same cost profile as typed linting generally
(see §11). The server analyser is a JVM + Node bridge over a full project — CI-scale.

### Licensing — **a genuine landmine**

| Source | Declared licence |
|---|---|
| npm `package.json` `license` field for `eslint-plugin-sonarjs@4.2.0` | `LGPL-3.0-only` |
| `package/LICENSE` **inside the published tarball** | **SONAR Source-Available License v1.0** (2024-11-13) |
| `SonarSource/SonarJS` repo `LICENSE.txt` | **SONAR Source-Available License v1.0** |
| GitHub licence detection for the repo | `NOASSERTION` |

Verified by downloading the published tarball and reading `package/LICENSE` directly. SSAL v1.0
defines:

> "**'Competing'** means marketing a product or service as a substitute for the functionality or
> value of SonarQube. A product or service may compete regardless of how it is designed or
> deployed. For example, a product or service may compete even if it provides its functionality
> via any kind of interface (including services, libraries, or **plug-ins**), even if it is ported
> to a different platform or programming language, and **even if it is provided free of charge**."

| Question | Answer |
|---|---|
| Is the npm `license` field reliable here? | **No.** It contradicts the LICENSE shipped in the same tarball |
| May we copy SonarJS rule code or derive rule content from it? | **Treat as no.** A free security ESLint plugin plausibly falls inside "Competing" as SSAL defines it — the definition explicitly reaches plug-ins, other languages, and free products |
| Practical instruction | Do not read SonarJS rule implementations for our rules. Cite Sonar's **public RSPEC rule descriptions** (`rules.sonarsource.com`, `sonarsource.github.io/rspec`) as *taxonomy* only, never the implementation |

The 🔧/💡/💭 counts above are metadata from a generated README table, not rule content, and are
cited as an observation about their release discipline.

---

## 9. Snyk Code

Proprietary SaaS (engine formerly DeepCode). No public repository, no SPDX identifier.

### Detection capabilities

Rule count for JS/TS: **`UNVERIFIED`** — the docs reference a "JavaScript and TypeScript rules"
page, but it was not fetchable at time of research and no count appears in the corpus at
`docs.snyk.io/llms-full.txt`.

Supported file formats: `.ejs`, `.es`, `.es6`, `.htm`, `.html`, `.js`, `.jsx`, `.ts`, `.cts`,
`.mts`, `.tsx`, `.vue`, `.mjs`, `.cjs`, `.erb`.

### Taint capabilities — **inter-file**

> "Interfile analysis in Snyk Code is available for all supported languages except COBOL."

The JavaScript page's "Available features" list is exactly two items: "Reports", "Interfile
analysis".

### Framework awareness

A curated list of ~70 supported JS frameworks and libraries, including `axios`, Angular,
`apollo-server`, `bcrypt-nodejs`, `crypto-js`, `dompurify`, `ejs`, `electron`, `execa`, `express`,
`express-mongo-sanitize`, `express-graphql`, `express-jwt`, `fs`/`fs-extra`/`graceful-fs`,
`hapi.js`, `jQuery`, `js-yaml`, `koa`, `libxmljs`, `lodash`, `minimist`, `mongodb`, `Mongoose`,
`Nestjs`, Node `crypto`, `node-forge`, `node-serialize`, `pg`, `pg-promise`, `rimraf`,
`sanitize-html`, `shelljs`, `superagent`, `underscore`, `url`, `vm`, `xpath`, `yargs`, "React —
Partial", plus a notable cluster of AI SDKs (`@anthropic-ai/sdk`, `openai`,
`modelcontextprotocol/typescript-sdk`, `fastMCP`, `@huggingface/inference`, `@mistralai/mistralai`).

How the knowledge is encoded is not public. Docs describe the approach:

> "Most frameworks are partially supported out of the box, as Snyk Code needs only to parse the
> code to analyze it. In some cases, frameworks may require specific rules, or require specific
> program analysis engine updates, or both."

### Extensibility — **none, and this is a real gap we can beat**

Snyk's "custom rules" product is **Infrastructure-as-Code only** (Rego / SDK). Searching the full
documentation corpus for custom-rule authoring surfaces only IaC custom rules and Open Source
*security policies*. There is **no user-authored source/sink/sanitizer facility for Snyk Code.**
Framework coverage arrives when Snyk ships it.

### False-positive reputation

Vendor-claimed low. No independent primary measurement located. **`UNVERIFIED`.**

### Performance

Cloud analysis; the CLI uploads or analyses out-of-process. Not an editor-time per-keystroke
linter. No published figures located (`UNVERIFIED`).

### Licensing

Proprietary. Governed by Snyk's commercial terms. **Nothing is reusable** — not the engine, not
the rules, not the framework list as a data artifact. The framework list is cited above as
observable market evidence of what a commercial vendor thinks is worth modelling.

---

## 10. Bearer

**Repo** `Bearer/bearer` · 2733 stars · **Elastic License 2.0** · rules in `Bearer/bearer-rules`
(40 stars), also **Elastic License 2.0** (both verified by reading `LICENSE.txt`; GitHub reports
`NOASSERTION` for both).

### Detection capabilities

Rule files per language in `bearer-rules`:

| Language | Rule files |
|---|---|
| Python | 108 |
| **JavaScript** | **100** |
| Java | 94 |
| Ruby | 92 |
| PHP | 81 |
| Go | 77 |

JS tree is framework-partitioned: `rules/javascript/express/` (~22 rules — `cross_site_scripting`,
`nosql_injection`, `path_traversal`, `open_redirect`, `server_side_request_forgery`,
`unsafe_deserialization`, `xml_external_entity_vulnerability`, `jwt_not_revoked`,
`insecure_cookie`, `helmet_missing`, `insecure_allow_origin`, …), `rules/javascript/hapi/`,
`rules/javascript/lang/` (`dangerous_insert_html`, `dynamic_os_command`, `dynamic_regex`,
`sql_injection`, …).

Two scanners: `sast` (default, rule-driven) and `secrets` (Gitleaks patterns; docs note "Secret
detection patterns are not configurable today").

### Taint capabilities — **not taint tracking; detector composition**

Bearer composes *named detections*. A rule declares `patterns` with `$<VAR>` metavariables and
`filters`; a filter can require `detection: <id>` at a `scope` (`cursor` | `result`). Shared
detections act as the source set and are pulled in with `imports:`. Actual JS XSS rule shape:

```yaml
imports:
  - javascript_shared_common_user_input
patterns:
  - pattern: res.send($<USER_INPUT>)
    filters:
      - variable: USER_INPUT
        detection: javascript_express_cross_site_scripting_user_input
        scope: result
auxiliary:
  - id: javascript_express_cross_site_scripting_sanitizer
    patterns: [ '{ $<_>: $<!>$<_> }' ]
  - id: javascript_express_cross_site_scripting_user_input
    sanitizer: javascript_express_cross_site_scripting_sanitizer
    patterns:
      - pattern: $<UNSANITIZED_USER_INPUT>
        filters:
          - variable: UNSANITIZED_USER_INPUT
            detection: javascript_shared_common_user_input
            scope: cursor
```

Classification: **intra-procedural at best.** The `scope` mechanism gives limited local dataflow
resolution, not path-sensitive propagation across statements. Exact dataflow depth and whether
`scope: result` crosses statement boundaries: **`UNVERIFIED`** — the docs do not state it.

`sanitizer` is a **rule reference**, not a name pattern: "The id of an auxiliary rule which is used
to restrict the main rule. If the sanitizer rule matches then the main rule is disabled inside the
matched code." Correct in principle (explicit, not heuristic); coarse in scope (disables inside a
region, not on a flow path).

### Framework awareness

Directory per framework, plus `imports:` of shared cross-framework detections. Same shape as
Semgrep, with the addition of shared detection reuse — a middle point between Semgrep's
per-rule duplication and CodeQL's central model.

### Extensibility — genuinely good

- `bearer scan . --external-rule-dir /path/to/rules/`, or `external-rule-dir:` in config
- Custom rules use the **exact same YAML format** as built-ins
- `--only-rule` to run just your own

Two mechanisms worth stealing:

1. **`trigger.match_on: absence` + `required_detection`.** Expresses "this security control is
   missing" (helmet not configured, `force_ssl` false) without any taint engine. The
   `required_detection` gate is what makes it safe: the rule only fires in a file that actually
   contains the thing being configured.
2. **`data_types_required` / `only_data_types` / `skip_data_types`.** Severity and firing gated on
   whether sensitive data is present. Bearer also escalates severity dynamically based on
   detected data types.

### Documented sharp edge — in their own docs

> "**Variable joining.** When a rule relies on another rule as part of its `filter` declaration,
> the variables are treated as a single set when matching against the code. Variables with the
> same name will identify as the same AST node. This can cause problems where the wrong AST nodes
> are used in the detection, leading to unexpected scan results."

A composition hazard we would inherit directly if registry entries can reference each other and
share a metavariable namespace.

### False-positive reputation

No published figures located. **`UNVERIFIED`.** Architecturally: explicit sanitizer references and
`data_types_required` gating are FP-reducing; region-scoped (rather than flow-scoped) sanitizers
and variable joining are FP/FN-producing.

### Performance

Single Go binary, tree-sitter based, whole-repo scan. Fast for a CLI. Still out-of-editor.

### Licensing

**Elastic License 2.0** for engine *and* rules — source-available, **not** OSI-approved. Verbatim
limitations:

> "You may not provide the software to third parties as a hosted or managed service, where the
> service provides users with access to any substantial set of the features or functionality of
> the software."

> "You may not alter, remove, or obscure any licensing, copyright, or other notices of the
> licensor in the software."

| Question | Answer |
|---|---|
| May we run Bearer on our own code? | Yes |
| May we vendor or port Bearer rule content into our npm package? | ELv2 permits derivative works and distribution, but the notice-retention obligation and the hosted-service limitation make shipping ELv2-derived content inside an MIT plugin legally murky and commercially risky. **Do not.** |
| What we take | The `trigger: absence` + `required_detection` pattern, `sanitizer`-as-rule-reference, and the variable-joining warning. Concepts, not content |

---

## 11. njsscan

**Repo** `ajinabraham/njsscan` · 452 stars · **LGPL-3.0** (`LICENSE` = GNU LGPL v3).

### Detection capabilities

| Location | Files |
|---|---|
| `njsscan/rules/semantic_grep/**` | **68** YAML |
| `njsscan/rules/pattern_matcher/template_rules.yaml` | 1 |
| `njsscan/rules/missing_controls.yaml` | 1 |

Architecture, per its own README: "a simple pattern matcher from `libsast` and syntax-aware
semantic code pattern search tool **semgrep**". njsscan is a **wrapper**. Its scan output
literally reports two phases: "Pattern Match" and "Semantic Grep".

### Taint capabilities — **inherits Semgrep CE's ceiling: intra-procedural, single-function**

njsscan delegates semantic matching to Semgrep. Whatever Semgrep CE can do, njsscan can do; no
more. It adds no dataflow of its own.

### Rule taxonomy — the most useful thing about it

A well-organised checklist of Node.js vulnerability classes, worth reading as a coverage target:

| Category | Rules |
|---|---|
| `eval` | `eval_node`, `eval_require`, `eval_sandbox`, `eval_vm_injection`, `eval_vm2_injection`, `eval_yaml_deserialize`, `eval_deserialize`, `eval_grpc_deserialize`, `server_side_template_injection` |
| `database` | `sql_injection`, `sql_injection_knex`, `nosql_injection`, `nosql_find_injection`, `sequelize_tls`, `sequelize_tls_validation`, `sequelize_weak_tls` |
| `xss` | `xss_node`, `xss_dom`, `xss_templates`, `xss_mustache_escape`, `xss_serialize_js` |
| `traversal` | `path_traversal`, `resolve_path_traversal`, `express_hbs_lfr`, `archive_path_overwrite` |
| `ssrf` | `ssrf_node`, `ssrf_phantomjs`, `ssrf_playwright`, `ssrf_puppeteer`, `ssrf_wkhtmltoimage`, `ssrf_wkhtmltopdf` |
| `xml` | `xxe_node`, `xxe_expat`, `xxe_sax`, `xxe_xml2json`, `xpathi_node`, `xml_entity_expansion_dos` |
| `jwt` | `jwt_none_algorithm`, `jwt_hardcoded`, `jwt_express_hardcoded`, `jwt_exposed_credentials`, `jwt_exposed_data`, `jwt_not_revoked` |
| `headers` | `header_cookie`, `header_cors_star`, `header_helmet_disabled`, `header_injection`, `host_header_injection`, `header_xss_protection` |
| `dos` | `regex_dos`, `regex_injection`, `express_bodyparser_dos`, `layer7_object_dos` |
| `exec` | `exec_os_command`, `exec_shelljs` |
| `crypto` | `crypto_node`, `timing_attack_node`, `tls_node` |
| `generic` | `error_disclosure`, `hardcoded_secrets`, `hardcoded_passport`, `logic_bypass` |
| **`good`** | `good_anti_csrf`, `good_helmet_checks`, `good_ratelimiting` |
| Other | `open_redirect`, `buffer_noassert`, `security_electron` |

The **`good/` directory** is the idea worth noting: rules that match *correct* configuration,
feeding a `--missing-controls` mode. Same concept as Bearer's `trigger: absence`, implemented as
positive-detection rules plus an inversion at report time.

### Framework awareness

By vulnerability class rather than by framework, with framework names appearing inside rule ids
(`express_*`, `sequelize_*`, `knex`, `puppeteer`, `playwright`). No shared model.

### Extensibility

Not designed as a platform. `-c .njsscan` config for skipping rules; adding a rule means writing
Semgrep YAML into the package. Output formats are its strength: JSON, SARIF 2.1.0, SonarQube,
DefectDojo, GitLab SAST, HTML.

### Performance

Python 3.10+, **macOS and Linux only**, spawns Semgrep. Whole-repo, seconds to minutes. Not an
editor tool.

### Licensing

**LGPL-3.0.** Copying rule YAML into an MIT npm package would impose LGPL-3.0 terms. Additionally,
its Semgrep-format rules may themselves derive from Semgrep registry content, which carries the
non-distribution restriction from §6. **Do not reuse.** The taxonomy above is cited as a coverage
checklist; the underlying vulnerability classes are independently documented by OWASP and CWE and
should be cited from there.

---

## 12. typescript-eslint (relevant type-aware rules)

**Repo** `typescript-eslint/typescript-eslint` · **MIT** · v8.67.0 · **135 rule files** in
`packages/eslint-plugin/src/rules` · ~88 M downloads/week.

Not a security plugin. Included because it is the **only widely deployed type-aware analysis
hosted inside ESLint**, and therefore the substrate a taint-aware plugin can stand on.

### Security-relevant type-aware rules

| Group | Rules | Security relevance |
|---|---|---|
| `any` propagation | `no-unsafe-assignment`, `no-unsafe-argument`, `no-unsafe-call`, `no-unsafe-member-access`, `no-unsafe-return` | Effectively an **`any`-taint tracker**. `any` is the type system's own "unknown provenance" marker, and it propagates *inter-file, through the TS checker* |
| Assertion escapes | `no-unsafe-type-assertion`, `no-unnecessary-type-assertion`, `consistent-type-assertions`, `no-non-null-assertion` | Where developers manually discard the checker's knowledge — i.e. where our own type-derived confidence must drop |
| Direct sinks | `no-implied-eval` | Genuine sink rule: string arguments to `setTimeout`/`setInterval`/`Function` |
| Interpolation constraints | `restrict-template-expressions`, `restrict-plus-operands`, `no-unnecessary-template-expression` | Constrain what can be interpolated into template literals and concatenations — the exact mechanism most XSS/SQLi sinks use |
| Other unsafe-* | `no-unsafe-enum-comparison`, `no-unsafe-declaration-merging`, `no-unsafe-function-type`, `no-unsafe-unary-minus` | Type-soundness, adjacent |
| Async correctness | `no-floating-promises`, `no-misused-promises`, `await-thenable`, `require-await`, `return-await` | Not security, but where unhandled rejections silently swallow failed authorisation checks |

### Taint capabilities — none, but **inter-file type propagation**

There is no taint engine. But the TypeScript checker gives, for free and across files: the call
graph, symbol resolution, return types, and `any` propagation.

**The crucial nuance: types are not provenance.** A `string` returned from `req.query.q` and a
`string` from a literal are the same type. The checker buys us *structure* — which function is
being called, what shape it returns, whether a value has escaped the type system into `any` — not
*taint*. Anyone claiming type-aware linting gives them taint tracking has confused the two.

### Framework awareness

None. It models TypeScript, not libraries.

### Extensibility

Per-rule options. Far more important for us: `ESLintUtils.getParserServices(context)` is a
**public, MIT-licensed API** for reaching the TS type checker from inside an ESLint rule, and
`parserOptions.projectService` provides cross-file symbol resolution.

### Performance — the real cost, and the reason to make it optional

Vendor statements:

> "if you're using type-aware linting, your lint times should be roughly the same as your build
> times."

> "Most performance slowdowns in ESLint rules are from type-aware lint rules calling to
> TypeScript's type checking APIs."

Documented aggravators: overly wide `tsconfig` `include` globs (`**/*` pulls in build artifacts);
`**` patterns in `parserOptions.project` causing "much more disk IO than expected"; changing
`extraFileExtensions` between files forcing "a full project reload" of the underlying TS server.

### Licensing

**MIT**, repo and npm consistent. The only tool in this survey we could genuinely build on.

Note the local constraint: `AGENTS.md` mandates "CommonJS … No ESM, no TypeScript, no build step",
and `package.json` currently has no TypeScript dependency. Consuming *parser services* is a
peer-dependency and optional-capability decision, not a build-step one — but it must be optional,
or we break the promise for plain-JS consumers.

---

## 13. What to borrow (ideas, not code)

Each item: the technique, and why it survives the constraints — ESLint-hosted, one file at a time,
no build step, CommonJS, published as an npm package.

### 13.1 Models-as-data registry (CodeQL)

**Technique.** Library and framework knowledge lives in a table of tuples — `(origin, access path,
kind)` — not in `if` branches inside rules. Adding a framework is a data edit; the analyser never
changes.

**Fits because** `machinery/security/registry.js` is already specified as "framework knowledge:
sources, sinks, sanitizers (**data, not code branches**)". A tuple table is plain CommonJS data:
diffable in review, testable as data, contributable by a framework specialist who never opens the
taint engine, and free at require-time. Adopt the **access-path vocabulary** — `Member[name]`,
`Argument[n]`, `ReturnValue` — because it is expressive enough for JS and reads as an ordinary
string in a JS object literal. Skip `Fuzzy`: it is an inter-file affordance we cannot honour.

### 13.2 Flow summaries for library functions (CodeQL `summaryModel`)

**Technique.** A tuple states what a library call does to taint without analysing its body:
argument 0 flows to the return value, tainted.

**Fits because it is the single highest-leverage idea for a per-file analyser.** We cannot see
into `node_modules` and we do not want to. Most real flows in a web codebase are
`source → a few library calls → sink`, all inside one request handler or one component. Summaries
replace inter-file analysis for exactly that shape. This is what converts "per-file taint" from a
toy into something that catches real bugs — and it is a data table, not an engine.

### 13.3 Separate taint configuration from pattern syntax (Semgrep)

**Technique.** Sources, sinks, sanitizers, and propagators are four independent named lists that a
rule *composes*. The pattern language and the taint configuration are orthogonal.

**Fits because** an ESLint rule is already a visitor. The visitor should ask the shared layer two
questions — "is this node a sink of kind *k*?" and "is this value tainted with kind *k*?" — and
nothing else. This is exactly what `AGENTS.md` already mandates ("Never reimplement taint logic
inside a rule"); Semgrep's key names are a field-proven vocabulary for the boundary.

**Include `propagator` explicitly.** Without it, every `array.map(x => x)`, `JSON.parse`, and
`String()` either terminates the analysis (false negative) or is treated as a sink (noise).

### 13.4 Barrier and barrier *guard* typing (no-unsanitized + CodeQL `barrierModel` / `barrierGuardModel`)

**Technique.** Two distinct sanitizer forms:

- **barrier** — this call clears taint: `escapeHtml(x)` produces untainted-for-`html`
- **barrier guard** — taint is cleared only on the branch where a check succeeded:

```js
if (Object.hasOwn(allowed, key)) { return obj[key] }   // guarded
if (allowedKeys.includes(key))   { return obj[key] }   // guarded
```

**Fits because the guard form is precisely what `detect-object-injection` lacks**, and it is the
entire difference between an unusable rule and a shippable one. It is also cheap in ESLint: scope
analysis plus the enclosing `if`/`&&`/early-return test is per-file information we already have.

**Type the barriers by kind.** An HTML escaper must not clear SQL taint. Encode `kind` on every
tuple (`html`, `sql`, `path`, `shell`, `url`, `regexp`) so cross-kind sanitizer confusion — a real
source of both FPs and FNs — is structurally impossible.

### 13.5 The tagged-template sanitizer requirement (no-unsanitized)

**Technique.** Where the framework offers one, require the escaper to be applied as a tagged
template so escaping lands on the *interpolations*:

```js
el.innerHTML = safeHtml`<a href="${url}">${label}</a>`
```

**Fits because** it makes correct ordering *structural* rather than something the analysis must
prove. `escapeHtml('<a href="' + url + '">')` — sanitize-too-late — cannot be written in this
form. One registry entry replaces an ordering analysis we would otherwise have to build. Applies
directly to any Kaliber project that sets HTML.

### 13.6 Per-rule quickfix conservatism (SonarJS)

**Technique.** Default to diagnostic-only. Use ESLint **suggestions** for anything
security-relevant. Reserve `fix` for provably safe mechanical transforms.

**Fits, and is quantified.** In `eslint-plugin-sonarjs`'s own generated rules table: **6 of 293
rules autofix (2 %)**, 38 offer suggestions, 230 are in `recommended`. That is the ratio a mature
vendor with a large rule count maintains. `AGENTS.md` already forbids unsafe autofix; this gives us
an external benchmark to point at, and a concrete target ratio.

### 13.7 Flow-path reporting in diagnostics (CodeQL and Semgrep both)

**Technique.** Report at the sink, but name the source and the intervening steps.

```
Tainted value reaches res.redirect() — flows from req.query.next (line 12) via
`target` (line 14). No url-kind sanitizer on the path.
```

**Fits because it is nearly free and changes triage cost more than any precision improvement.**
The taint layer already walks the path to reach its conclusion; it just has to keep it. ESLint
supports a rich `message` plus a precise report `loc`, and modern ESLint report options carry
additional locations. Per `README.md`, our `meta.docs.description` is already treated as the
primary context surface for both editors and LLM assistants — a message that names the source is
the same investment.

A reviewer can dismiss a false positive in seconds when they can see the path. They cannot dismiss
"Generic Object Injection Sink" at all — which is why nobody triages it.

### 13.8 Confidence and impact as separate metadata, plus an opt-in `audit` tier (Semgrep)

**Technique.** Every rule carries `confidence`, `likelihood`, `impact` independently. Low-confidence
rules ship in a **second, opt-in config**, not in `recommended`.

**Fits because** `machinery/security/finding.js` is already specified with exactly this split
("Severity (impact if exploited) and confidence (how sure the analysis is) are separate axes.
ESLint level follows from both"). Semgrep validates both the shape *and* the packaging: their
`security/audit` tier is where the noisy-but-informative rules go. We should ship
`recommended` (high confidence only) and something like `audit` (opt-in), and never mix them.

### 13.9 "Missing control" rules via absence + required detection (Bearer, njsscan)

**Technique.** Fire when a security control is *absent*, but only in a file where a
`required_detection` proves the relevant construct is present.

**Fits, narrowly.** ESLint has no project view, so "helmet is not configured anywhere" is
unanswerable. But "this file constructs an Express app **and** does not configure helmet" is a
per-file question. The `required_detection` gate is precisely what makes it safe: the rule cannot
fire in a file that has nothing to do with server setup. Keep the scope that tight or don't ship
it.

### 13.10 Framework knowledge keyed on import provenance, not identifier spelling (eslint-plugin-security)

**Technique.** Before treating `x.readFile(p)` as a sink, resolve `x` back through scope to a
`require('fs')` / `import … from 'fs'`, handling aliases, renaming destructure, namespace imports,
and one level of member access.

**Fits because it is per-file, needs no type checker, and is cheap** — and because it is the
*minimum bar*. Anything keyed on the identifier's spelling is the eslint-plugin-xss failure mode.
`getImportAccessPath` is the one good idea in eslint-plugin-security and it is Apache-2.0, so we
may even reuse it directly with notices; we will reimplement it against our registry's origin
column instead, so provenance resolution and the registry share one vocabulary.

### 13.11 Type information as an optional accelerant, never a requirement (typescript-eslint)

**Technique.** If parser services are available, use the checker to sharpen — is this value `any`?
does this call return `string`? is this `Response` object really from Express? If not, degrade
gracefully to syntax-only.

**Fits because** it preserves the no-build-step promise for plain-JS consumers while giving TS
projects better precision. Follow the ecosystem convention with two configs
(`recommended` / `recommended-type-checked`), which every TS developer already understands.

**And state the limit honestly in the docs:** types give structure, not provenance (§12).

---

## 14. What not to do

Documented failure modes, with the concrete evidence.

### 14.1 Do not report a syntactic shape and call it a vulnerability

`detect-object-injection` is the archetype. Its entire implementation visits `MemberExpression`,
tests `node.computed === true && node.property.type === 'Identifier'`, and picks one of three
messages from `node.parent.type`. There is no source, no sanitizer, no guard recognition, and no
`meta.schema`.

Consequences, all documented:

- **GitLab removed it from both their ESLint and their Semgrep rulesets** for producing "a
  significant amount of false positives", noting it "matches on almost every access to an object's
  properties via `[]` notation" ([issue 351399](https://gitlab.com/gitlab-org/gitlab/-/issues/351399))
- Plugin [issue #21](https://github.com/eslint-community/eslint-plugin-security/issues/21) has
  been **open since August 2017** with 20 comments
- [Issue #22](https://github.com/eslint-community/eslint-plugin-security/issues/22): "completely
  overwhelming"
- [Issue #67](https://github.com/eslint-community/eslint-plugin-security/issues/67) proposed the
  static-value heuristics that would fix it, and was **closed without landing them**
- [#124](https://github.com/eslint-community/eslint-plugin-security/issues/124) (switch-case
  discriminant), [#126](https://github.com/eslint-community/eslint-plugin-security/issues/126)
  (type-safe key), [#136](https://github.com/eslint-community/eslint-plugin-security/issues/136)
  are individual FP reports
- A published benchmark attributes **8 of 11 total false positives to this one rule**

**Rule for us:** every security rule must ask about the *value*, not only the *shape*. If we
cannot say something about provenance, the finding belongs in an opt-in tier or not at all.

### 14.2 Do not put a high-FP rule in `recommended`

All **fourteen** eslint-plugin-security rules are in `recommended`, `detect-object-injection`
included. The predictable result: a team's first encounter with the plugin is its worst rule, and
they disable **the plugin**, not the rule. Whatever real value the other thirteen rules carry is
lost with it. Nine years of open issues is the receipt.

### 14.3 Do not infer security types from identifier names

`eslint-plugin-xss`'s default, from the source: `htmlVariableRules = ['html/i']`. A variable is
HTML-typed **iff its name matches `/html/i`**. Both failure directions follow: `const html =
'<h1>Title</h1>'` is reported; the identical value in `const content` is invisible.

`AGENTS.md` already forbids the sanitizer-by-name form. **Forbid the source-by-name and
sink-by-name forms too.** Names are a hint for a human, never a fact for an analyser.

### 14.4 Do not treat unknown calls as safe

In `eslint-plugin-xss`, `encode(input)` is accepted — not because `encode` is modelled, but
because any call not declared `passthrough` is assumed to produce encoded output.
`attackerControlled(input)` is accepted identically.

**Rule for us:** an unmodelled call yields **unknown**, and `unknown` must be an explicit third
state with a decision recorded per kind. Silently treating it as clean is a false negative;
automatically treating it as tainted is the noise generator. Pick per kind and document the pick
in the rule's `readme.md`.

### 14.5 Do not taint everything reachable from function parameters

Semgrep's registry Express rules do exactly this — `pattern-inside: function ...($REQ, $RES) {...}`
then treat `$REQ` as a source — and it is the *right* compromise there, for a rule that is also
marked `interfile: true` and expected to run on the Pro engine.

In a per-file plugin, generalising it means every `function handler(a, b)` becomes a taint source
and every downstream call becomes a finding. **Gate parameter-sources on recognised handler shapes
from the registry** — an Express route callback, a Next.js route handler export, a Kaliber
`requestHandlers` entry, a Sanity/GROQ resolver — and never on arity or parameter position alone.
Note that even Semgrep gates on a `metavariable-regex` for the HTTP method name rather than on
shape alone.

### 14.6 Do not ship an over-broad sink list, and make the message quote the user's code

`detect-non-literal-fs-filename` reports any non-provably-static argument at a known index for
~40 `fs` functions across `fs`, `node:fs`, `fs/promises`, `node:fs/promises`, and `fs-extra`.
[Issue #22](https://github.com/eslint-community/eslint-plugin-security/issues/22) gives two
concrete complaints:

1. `${process.cwd()}/path/to/json` is reported as a path risk
2. A call through a *different* package (`jsonFile.readFile`) is reported with the message text
   **`fs.readFile`** — the diagnostic describes code the user did not write

Two lessons: keep sink lists narrow and provenance-checked; and make the message quote the actual
callee and the actual argument. A diagnostic that misdescribes the code destroys trust faster than
a false positive that describes it accurately.

### 14.7 Do not confuse "not a literal" with "tainted"

`is-static-expression.js` is a competent constant-folding check. But "this expression is not
provably constant" is a vastly larger set than "this expression carries attacker-controlled data".
Every rule built on the former is noisy on any codebase that uses variables — which is all of
them.

This is the whole reason to build a taint layer. If a rule in
`machinery/security/` ends up asking "is this a literal?", it has silently regressed to
eslint-plugin-security.

### 14.8 Do not autofix security findings

**No tool in this survey autofixes an injection finding.** SonarJS, with 293 rules, autofixes 6
of them (2 %) and none are injection rules. The field agrees by omission.

Concretely why: a mechanical `escapeHtml(...)` wrap changes behaviour when the value was already
trusted HTML; an inserted `Object.hasOwn` guard changes control flow; a `parameterised query`
rewrite changes SQL semantics. Suggestion or diagnostic only. Already in `AGENTS.md`; this section
is the external corroboration.

### 14.9 Do not let registry entries share a metavariable namespace

Bearer documents "variable joining" in its own guide: when a rule filters on another rule's
detection, same-named variables are unified to the same AST node, "leading to unexpected scan
results." If our registry entries can reference each other, **keep bindings local to the entry.**
A registry is a lookup table, not a unification engine.

### 14.10 Do not claim a taint depth you do not have

The two clearest examples in this survey:

- Semgrep markets taint mode prominently, while CE "can only analyze interactions within a single
  function" — and the flagship public Express XSS taint rule carries `options: { interfile: true }`
- `eslint-plugin-sonarjs` ships 293 rules and **zero** injection-taint rules, while "taint
  analysis" is a Developer-Edition server capability

Our rule docs must state, per rule: per-file scope-based analysis, library flows via registry
summaries, **no cross-file propagation**, and — as `AGENTS.md` already requires — that a clean
result does not prove absence of a vulnerability. The moment we overclaim, we inherit the credibility
problem instead of solving it.

### 14.11 Do not trust an npm `license` field you have not verified against the tarball

`eslint-plugin-sonarjs@4.2.0` declares `LGPL-3.0-only` in `package.json`. The `LICENSE` file
**inside the same published tarball** is the SONAR Source-Available License v1.0, with a
"Competing" clause that explicitly reaches plug-ins, ports to other languages, and free products.
npm metadata is not a licence. Verify by unpacking.

### 14.12 Do not let the plugin's cost scale with the project

CodeQL needs a database. Snyk needs an upload. Semgrep Pro needs a whole-project graph. njsscan
spawns a Python process. SonarQube needs a server and a full analysis. All are appropriate for CI
and wrong for a keystroke.

**Hard line:** if the analysis cannot answer from one file plus a static registry (plus, optionally,
the TS checker the project is already paying for), it does not belong in this plugin. Put it in a
CI ruleset, or leave it to the heavyweights and say so in the docs.

---

## 15. Positioning

The field is bimodal, and the gap between the two modes is where we live.

**On one side**, `eslint-plugin-security` is installed nearly 4 million times a week and is a
shallow AST matcher with a nine-year-old, externally-documented noise problem. Its 14 rules ship
with no taint model, no sanitizer model, no guard recognition, no framework registry, and no user
extensibility; its worst rule is in `recommended`; a major consumer removed that rule outright and
said why in public. `@microsoft/eslint-plugin-sdl` is honest about being an API-ban list, is
archived, and still does 1.57 million downloads a week. `eslint-plugin-xss` types values by
identifier spelling and cannot run on ESLint 9. `eslint-plugin-no-unsanitized` is the only
genuinely well-built member of this group, and it deliberately covers two rules. Nothing in the
ESLint-hosted tier does taint analysis. Nothing in it is framework-aware beyond a hardcoded array
of package names.

**On the other side**, CodeQL and Semgrep Pro and Snyk Code and SonarQube do real inter-file taint
analysis, and every one of them is structurally out-of-editor. CodeQL needs a database and its
licence forbids running it against a private repo without paid GHAS. Semgrep CE — the part you can
actually run for free — is single-function, while the registry rules that would catch your Express
XSS are authored `interfile: true`. Snyk Code is inter-file and has **no** user-authored rule
facility for code at all. SonarQube's injection rules require Developer Edition and a full project
analysis. Each carries a licence that forbids us reusing its rule content: Semgrep Rules License
(no distribution), SSAL v1.0 (Competing clause), Elastic License 2.0 (notice retention), LGPL-3.0
(copyleft), proprietary (nothing).

**The defensible niche is the middle, and it is genuinely unoccupied: per-file taint with a
models-as-data registry, delivered at ESLint speed inside the editor.**

Four things make it defensible rather than merely unoccupied:

1. **Latency is a capability, not a metric.** A finding delivered while the developer is still
   holding the context in their head gets fixed. The same finding in a CI report gets triaged, and
   the one after that gets suppressed. No heavyweight tool can compete on this axis, because
   extraction and whole-project graphs are load-bearing for them.
2. **Flow summaries make per-file taint sufficient for most real bugs.** The heavyweights need
   inter-file analysis because they refuse to hardcode library knowledge. We can hardcode it — as
   data — and cover the dominant real-world shape: source, a few library calls, sink, all inside
   one handler or one component.
3. **Framework specificity is the thing generic tools structurally cannot do.** CodeQL models 36
   JS frameworks; Snyk lists ~70; neither knows what a Kaliber `requestHandlers` entry is, or that
   a `layoutClassName` prop is not a sink, or what the house GROQ conventions are. A registry that
   a framework specialist can extend in a JSON tuple, and that ships in the same package as the
   house conventions, is a capability none of them can match.
4. **We can ship what nobody in the ESLint tier ships: user-extensible sources, sinks, and
   sanitizers.** Snyk cannot do it at all. Sonar cannot. eslint-plugin-security cannot. Semgrep
   and Bearer can, but only outside the editor and under licences that prevent us reusing their
   content. Extensibility is where an MIT-licensed ESLint plugin has a structural advantage.

**What would make it fail** — in descending order of likelihood:

1. **Noise.** This is not a risk, it is *the* risk, and the failure mode is already fully
   documented in §14.1–14.7. If our XSS rule earns a GitLab-issue-351399 equivalent, the plugin is
   dead and the noise reputation transfers to the rest of the house rules in the same package. That
   coupling is the specific danger of shipping security rules inside `@kaliber/eslint-plugin`: a
   noisy security rule doesn't just get disabled, it gets the whole config distrusted. The metric
   in `AGENTS.md` — useful findings ÷ false-positive burden — is the only one that matters, and
   `recommended` must stay high-confidence-only even when that means shipping fewer rules.
2. **Overclaiming.** A security tool that promises taint analysis and delivers a literal-ness
   back-trace loses credibility once, permanently. Per-rule limitation statements are not
   documentation hygiene; they are the product.
3. **Registry rot.** Models-as-data only wins if the data stays current. A registry that lags
   Next.js or React by two majors is worse than no framework awareness, because it produces
   confident wrong answers. This needs an owner and a review cadence, not just a file.
4. **Scope creep into the heavyweights' territory.** The moment we need a project graph, a build
   step, or a cache directory, we have become a worse Semgrep — and lost the one axis we win on.
   The line in §14.12 is the product boundary, not an implementation detail.
5. **Sanitizer-model drift.** The registry-only sanitizer discipline (`AGENTS.md`) is load-bearing.
   The first `/sanitize|escape|clean/i` name check merged "just for this framework" is the
   beginning of the eslint-plugin-xss failure mode, and it will not be caught by tests.

The bar is not "find more than eslint-plugin-security". At 27.5 % recall on a published fixture
suite, that bar is low. The bar is **be trusted enough to stay in `recommended` for three years.**
Nothing in the ESLint tier has cleared it.

---

## Appendix A — licence reuse decision table

| Tool | Engine SPDX | Rules SPDX | May we read? | May we reuse content? | Decision |
|---|---|---|---|---|---|
| eslint-plugin-security | `Apache-2.0` | `Apache-2.0` | yes | yes, with notices + NOTICE of modifications | **Read only.** Reimplement provenance resolution against our registry |
| eslint-plugin-no-unsanitized | `MPL-2.0` | `MPL-2.0` | yes | per-file copyleft — copied files stay MPL-2.0 | **Read only.** Borrow the tagged-template idea |
| eslint-plugin-xss | `ISC` (npm) / none in repo | same | yes | provenance too weak to rely on | **Read only.** Specimen of an anti-pattern |
| @microsoft/eslint-plugin-sdl | `MIT` | `MIT` | yes | yes, with attribution | **Read only.** Cite MDN/Angular/Electron for the taxonomy instead |
| Semgrep engine | `LGPL-2.1` | — | yes | copyleft; we are not linking it | Not applicable |
| Semgrep registry rules | — | **Semgrep Rules License v1.0** | yes | **NO — "does not allow you to distribute the rules"**; a translation is equally prohibited | **Vocabulary only** (`pattern-sources` etc.) |
| CodeQL queries / libs / models | — | `MIT` | yes | legally yes with attribution | **Read only** per project constraint |
| CodeQL CLI / engine | **GitHub CodeQL Terms** | — | n/a | may not analyse non-OSS codebases or run in CI/CD without paid GHAS | **Unusable as a private-code validation oracle** |
| eslint-plugin-sonarjs | npm says `LGPL-3.0-only`; **tarball LICENSE is SSAL v1.0** | same | avoid | **NO** — "Competing" clause reaches free plug-ins in other languages | **Do not read for implementation.** Cite public RSPEC descriptions as taxonomy only |
| SonarQube analyser | commercial | proprietary | n/a | no | Nothing reusable |
| Snyk Code | proprietary | proprietary | n/a | no | Nothing reusable |
| Bearer CLI + rules | `Elastic-2.0` | `Elastic-2.0` | yes | notice retention + hosted-service limit make it risky inside an MIT package | **Read only.** Borrow `trigger: absence` and sanitizer-as-reference concepts |
| njsscan | `LGPL-3.0` | `LGPL-3.0` | yes | copyleft; rules may also derive from Semgrep registry | **Read only.** Use taxonomy as a checklist, cite OWASP/CWE |
| typescript-eslint | `MIT` | `MIT` | yes | yes, with attribution | **Buildable substrate.** Public parser-services API |

**Standing instruction:** the only licences under which we may ship derived content are `MIT` and
`Apache-2.0` (with notices). Everything else is read-only architectural reference. The project
constraint is stricter than the licences: describe techniques, copy nothing.

## Appendix B — `UNVERIFIED` claims

| Claim | Why unverified |
|---|---|
| Snyk Code JS/TS rule count | Docs page referenced from the JavaScript page returned 404; no count in `docs.snyk.io/llms-full.txt` |
| Snyk Code false-positive rate | Vendor-claimed only; no independent primary measurement located |
| Snyk Code performance figures | Not published |
| Bearer exact dataflow depth (does `scope: result` cross statement boundaries?) | Not stated in Bearer docs; inferred from rule structure only |
| Bearer / njsscan false-positive rates | No published figures located |
| Semgrep field/index sensitivity in taint mode | Not documented on the taint-mode page |
| Semgrep JS/TS rule *count* (as opposed to rule-file count) | Counted 173 `javascript/` + 30 `typescript/` YAML files; a file may declare multiple rules, so these are lower bounds |
| CodeQL JS query count as a total | 823 `.ql` in `javascript/ql` and 101 under `src/Security` are exact from the git tree; the repo-wide recursive tree was truncated by the API, so any repo-wide figure would be a lower bound |
| CodeQL per-project runtime | No figures in the overview docs |
| Per-rule allowlist options in `@microsoft/eslint-plugin-sdl` | Not enumerated; rule sources not read in detail |
| Peretz benchmark as a population FP rate | Published experience report, third-party, 40 vulnerable / 38 safe fixtures, tested v2.1.1 on ESLint 8.57. Indicative of shape; corroborated in direction by the issue tracker and GitLab, but not a measured population rate |
