# Security rules production-readiness execution plan

## Objective

Bring the experimental security rule set to a production-ready first release without expanding
its vulnerability coverage. Fix the known release blockers, reduce the default false-positive
surface, make both shipped presets valid ESLint 10 flat configs, and leave reproducible evidence
for correctness, performance, and documentation claims.

This is an execution plan for Claude. Implement it end to end; do not stop after analysis. Preserve
unrelated worktree changes and do not commit unless explicitly asked.

## Constraints

- Follow `AGENTS.md`, including CommonJS, no semicolons, two-space indentation, and primary-source
  citations for security claims.
- Do not add a dependency unless the standard library and installed packages are insufficient.
- Do not add new security rules or broaden sink/source coverage in this work.
- Do not add autofixes to security-sensitive rules.
- Preserve every existing public rule ID. Rules removed from a preset remain individually usable.
- Keep `configs.security` as the stable, high-confidence entry point.
- Add `configs['security-audit']` for lower-confidence audit findings.
- Treat OWASP Top 10 as taxonomy/awareness metadata, not proof of security coverage. Use OWASP ASVS
  5.0 for verifiable control mappings where a precise mapping exists.
- A clean ESLint result must never be documented as proof that an application is secure.

## Required outcome

At completion, all of the following must be true:

1. `plugin.configs.security` and `plugin.configs['security-audit']` work when passed directly to
   ESLint 10 without separately registering the plugin.
2. The default `security` preset contains only the high-confidence baseline listed below.
3. Heuristic matcher rules are confined to `security-audit`, or are gated on real import/global
   provenance before returning to the baseline.
4. Ordinary `<a target="_blank">` does not report; unsafe `window.open()` still does.
5. The all-rules performance and memory measurements are reproducible from a committed command.
6. Rule counts, preset levels, OWASP edition metadata, limitations, and citations agree with code.
7. `pnpm test` and `pnpm lint` pass with zero errors and zero warnings.

## Baseline policy

Put exactly these existing rules in `configs.security` for this release:

```text
security-no-sql-injection
security-no-command-injection
security-no-dom-xss-sink
security-no-path-traversal
security-no-firebase-path-injection
security-no-groq-injection
security-no-elasticsearch-injection
security-no-open-redirect
security-no-client-side-open-redirect
security-no-ssrf
security-no-node-tls-reject-unauthorized
security-no-disabled-tls-verification
security-no-jwt-alg-none
security-no-jwt-algorithm-confusion
security-no-insecure-cookie-flags
security-no-unsafe-deserialization
security-no-weak-key-size
security-no-zip-slip
```

Use `error` only for findings that are both high impact and high confidence under
`machinery/security/finding.js`. Keep taint, heuristic, or context-dependent findings at `warn`.
Do not copy the current levels blindly; verify each level against that matrix and its rule docs.

`configs['security-audit']` must include the complete `security` baseline plus every other existing
security rule at `warn`. It is an audit preset, not a CI-failure preset. Do not duplicate the
baseline rule map manually: build the audit map from the baseline map and explicit audit-only
entries so the two cannot drift.

## Phase 1: make the public presets valid

### Implementation

- Refactor `index.js` so the plugin object exists before the self-referencing flat configs are
  assigned.
- Give both presets `plugins: { '@kaliber': plugin }` and their respective `rules` maps.
- Preserve `plugin.rules`, `plugin.meta`, `plugin.configs.security`, and all current rule IDs.
- Use the baseline and audit policy above.
- Keep security rules out of the shared `eslint.config.js` as required by `AGENTS.md`.

### Tests

Add public-contract tests next to `rules/rule-names.test.js` that:

1. Call `new Linter().verify(code, plugin.configs.security)` directly and assert no configuration
   exception.
2. Assert a known baseline violation is reported by the direct preset.
3. Call the audit preset directly and assert an audit-only violation is reported.
4. Assert every security rule appears in the audit preset.
5. Assert the baseline contains exactly the 18 rule IDs listed above.
6. Assert audit-only rules are `warn`.

Do not merely test individual rule objects through `RuleTester`; that bypasses plugin resolution
and is why the current broken preset passed.

## Phase 2: separate baseline findings from audit findings

### Import and global provenance

Inventory every security rule using `getCalleeName`, receiver-name regexes, or bare identifier
names to infer a library API. For each occurrence, make one explicit decision:

- **Provenance-gated:** resolve the binding to the expected `import`/`require`, including aliases,
  namespace imports, named imports, destructuring, and `node:` aliases; or
- **Audit-only heuristic:** leave it out of `configs.security`, cap reported confidence at medium,
  and document that matching is name-based.

Do not build separate provenance walkers per rule. Extract one scope-based helper in `machinery/`
or extend the existing security registry matcher so rules share it. Reuse the helper in at least
the crypto/JWT family before accepting the abstraction.

At minimum, inspect each of these known receiver-blind areas, classify it as provenance-gated or
audit-only, and add the corresponding regression tests:

- `no-md5`
- `no-sha1-for-security`
- `no-ecb-mode`
- `no-des-3des`
- `no-static-iv`
- `no-jquery-html-sink`
- `no-template-autoescape-disabled`
- `no-plain-http-url`
- `no-sensitive-data-in-web-storage`
- `no-timing-unsafe-secret-comparison`

For every provenance-gated rule, add valid tests for an unrelated local function/object using the
same method name, plus invalid tests for destructured, aliased, namespace, and `node:` imports.

### HTML rule boundaries

- Keep `security-no-dom-xss-sink` as the baseline vulnerability rule.
- Keep `no-dangerously-set-inner-html`, `no-inner-html`, and `no-jquery-html-sink` audit-only.
- Reuse the shared HTML sink/sanitizer registry where practical; do not create another taint
  engine or generic rule factory.
- Ensure audit diagnostics say “Audit this non-constant value” rather than asserting attacker
  influence that was not established.
- Add tests proving the baseline does not double-report one HTML flow through multiple rules.

### Weak rules

- Remove `no-timing-unsafe-secret-comparison` from all default/baseline configuration. Keep the
  rule available only through `security-audit` for compatibility.
- Its documentation must state that identifier-name inference is heuristic and that remote timing
  exploitability is environment-dependent.
- Keep the hardcoded API-key, credential, crypto-key, and JWT-secret rule IDs separate, but extract
  shared literal/key classification where it eliminates actual repeated logic. Preserve their
  distinct messages and suppression controls.

## Phase 3: remove the obsolete tabnabbing diagnostic

In `rules/security/no-target-blank-without-noopener/`:

- Delete the JSX `<a target="_blank">` visitor and `anchorNoopener` message.
- Retain detection for `window.open()` without a statically proven `noopener` feature.
- Resolve `window` as the real global so a locally shadowed `window` object does not report.
- Treat a dynamic features argument as unknown: keep it audit-only and do not claim certainty.
- Update the rule name/description only if it can be done without changing the public rule ID.

Add regression tests for:

```js
<a href={url} target="_blank">link</a>                 // valid
<a href={url} target="_blank" rel="opener">link</a>    // valid: explicit behavior, not lint policy
window.open(url, '_blank')                             // invalid
window.open(url, '_blank', 'noopener')                 // valid
const window = { open() {} }; window.open(url)         // valid
```

Cite the current WHATWG link-type behavior in the readme. Do not retain a legacy-browser warning
without a supported-browser requirement proving it is still relevant.

## Phase 4: make performance evidence reproducible

Create a committed benchmark script, preferably `benchmarks/security.js`, and add
`pnpm benchmark:security`. It must measure, in one process after warmup:

- parse/lint baseline with no security rules;
- `configs.security`;
- `configs['security-audit']` with all rules;
- a no-sink real source file;
- a sink-dense synthetic file;
- a long concatenation chain at several sizes;
- repeated files sufficient to observe retained-memory growth.

Report median wall time, relative overhead, and RSS/heap delta. Make generated fixtures in memory
or under the OS temporary directory; do not commit generated output.

Use these release budgets:

- no-sink file: less than 1 ms absolute security overhead;
- whole-project or representative multi-file corpus: less than 10% median overhead for
  `configs.security`;
- audit preset: record the cost honestly; it may exceed the baseline budget but must not show
  unbounded growth;
- memory after repeated batches: no monotonic growth attributable to retained `SourceCode` keys.

Investigate the documented quadratic `getStaticValue` path in `taint.js`. Remove or replace the
early fold only if the full test suite proves behavior is unchanged and the benchmark demonstrates
the expected improvement. Add a regression benchmark/test that makes future quadratic regression
visible. Do not optimize unrelated matcher code without profile evidence.

Update `docs/research/performance.md` with the exact command, environment, results, and remaining
limitations. Replace the current “re-create the harness” instruction with the committed command.

## Phase 5: reconcile documentation and taxonomy

### Counts and configuration

- Derive the security rule count from `plugin.rules`; the current source of truth is 44 rules.
- Fix the stale “46 rules shipped” statement in `docs/research/next-steps.md` if that untracked file
  is intended to remain. Otherwise leave it untracked and report the discrepancy to the user.
- Fix every readme whose stated preset level differs from `index.js`, including
  `no-unsafe-deserialization`.
- Add a test that detects future disagreement between registered security rules and audit-preset
  entries.

### OWASP and ASVS

- Update the living coverage document to lead with OWASP Top 10:2025.
- Preserve the 2021 mapping only as explicitly versioned historical metadata where useful.
- Do not mechanically renumber categories. Classify each family against the official 2025
  definitions as one named category or `not mapped`, and cite the definition supporting the result.
- State plainly that OWASP discourages comprehensive Top 10 coverage claims by tools and recommends
  ASVS for verifiable coverage.
- Add precise `v5.0.0-x.y.z` ASVS references only where the rule actually verifies that requirement.
  Omit an ASVS mapping rather than using a vague chapter-level association.
- Describe expected structural gaps: supply chain requires SCA; insecure design, authorization,
  and exceptional-condition correctness require manual architecture analysis and runtime tests.

Use only primary sources: current OWASP pages, ASVS 5.0, CWE, RFCs, WHATWG, and official framework
or runtime documentation. Verify every new citation before adding it. A citation in
`rule-inventory.yaml` is not a substitute for a usable rule readme.

### Rule readmes

Every shipped security rule readme must contain:

- what the rule detects;
- whether it is in `security`, `security-audit`, or both;
- impact/severity and analysis confidence as separate concepts;
- CWE and versioned OWASP metadata where accurate;
- limitations and meaningful false-positive/false-negative boundaries;
- at least one directly relevant primary-source link.

Do not add boilerplate claims that the implementation cannot support.

## Phase 6: release verification

Run and record all of the following:

```sh
pnpm test
pnpm lint
pnpm benchmark:security
```

Then dogfood both presets read-only against the available Kaliber project corpus:

1. Run `security` first and classify every finding as true positive, useful audit finding, or false
   positive.
2. Run `security-audit` separately so audit noise cannot contaminate the baseline measurement.
3. Record project/file counts, elapsed time, findings per rule, and triage outcome in
   `docs/research/coverage-roadmap.md` or a focused production-readiness report.
4. The baseline release gate is zero known false-positive classes in the sampled first-party code.
   A one-off disputed finding must be documented; a repeatable false-positive family blocks that
   rule from `configs.security`.
5. Do not edit consumer projects during dogfood.

If the external corpus is unavailable, do not fabricate results. Record exactly what could not be
run and keep the dogfood gate open.

## Final verification checklist

- [ ] Both flat presets are self-contained and covered by public-contract tests.
- [ ] `configs.security` contains exactly the approved 18-rule baseline.
- [ ] `security-audit` contains all registered security rules at non-failing levels.
- [ ] Receiver/name heuristics are provenance-gated or explicitly audit-only.
- [ ] HTML policy rules cannot masquerade as taint-confirmed vulnerabilities.
- [ ] Anchor `target="_blank"` findings are removed; `window.open()` remains covered.
- [ ] Performance command and results are reproducible.
- [ ] No unbounded cache/memory behavior was observed.
- [ ] OWASP 2025 and ASVS statements use verified primary sources.
- [ ] Rule count and configuration-level documentation match code.
- [ ] Every security readme documents limitations and a primary source.
- [ ] `pnpm test` passes.
- [ ] `pnpm lint` has zero warnings.
- [ ] Baseline dogfood has no unresolved repeatable false-positive class.
- [ ] No unrelated files or user changes were reverted.

## Handoff report format

When finished, report using exactly these headings:

```text
Implemented
Preset membership
Provenance decisions
Performance results
Dogfood results
Verification
Remaining risks
```

Under `Remaining risks`, distinguish accepted static-analysis limitations from work that is still
required. Do not call the work production-ready if any required outcome or release gate above is
still open.
