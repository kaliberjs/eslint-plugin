# AGENTS.md

Guidance for AI agents working in `@kaliber/eslint-plugin`.

## What this repo is

A published ESLint plugin (`@kaliber/eslint-plugin`, ESLint 10, flat config) containing kaliber's
house rules — component conventions, `data-x` tracking rules, import rules — plus a curated
re-export of third-party configs. It is consumed by real projects, so structure changes are
breaking changes.

## Layout

```
index.js               plugin entry; every rule must be registered here
eslint.config.js       the shipped shared config
machinery/             shared helpers used by rules (ast, test, docsUrl, filename, word)
machinery/security/    shared security analysis layer (see below)
rules/<rule-name>/     index.js + test.js + readme.md
rules/security/<name>/ security rules — see below
rules/core/            tests pinning ESLint core rule behaviour
rules/third-party/     tests pinning third-party plugin rule behaviour
docs/research/         security research artifacts (canonical: rule-inventory.yaml)
docs/rules/            long-form rule documentation
```

## Conventions — follow these, do not modernize them

- **CommonJS.** `require` / `module.exports`. No ESM, no TypeScript, no build step.
- **No semicolons.** Two-space indent. Single quotes. Trailing commas in multiline.
- Named `function` declarations after the export, hoisted — not `const fn = () =>` at module scope.
- One rule per directory: `rules/<name>/index.js`, `test.js`, `readme.md`.
- `meta.docs.url` comes from `machinery/docsUrl(__dirname)`.
- Tests use `machinery/test`'s `test(ruleName, { valid, invalid })`; run with `node --test`.
- Every new rule must be added to `index.js` (`rules/rule-names.test.js` enforces reachability;
  a rule name may never contain `/`).
- **Security rules live in `rules/security/<name>/` and are registered as `security-<name>`.**
  The directory gives the files a home; the prefix gives the rule id a namespace. A rule *name*
  cannot be namespaced with a slash — ESLint's flat config reads everything before the last
  slash as the plugin name, so `@kaliber/security/no-x` would look for a plugin called
  `@kaliber/security`. Hence the prefix.
- Adding a dependency needs a real justification. Prefer the stdlib and what is already installed.
- Read a neighbouring rule before writing a new one. Match it.

## Commands

```
pnpm test        # node --test
pnpm lint        # eslint --config eslint.self.config.js .
```

## Security subsystem

The security rules are not independent AST matchers. They consume a shared analysis layer:

```
machinery/security/
  finding.js      severity / confidence / OWASP / CWE metadata + the ESLint-level matrix
  registry.js     framework knowledge: sources, sinks, sanitizers (data, not code branches)
  taint.js        per-file taint analysis, scope-based, cached per SourceCode
```

Rules stay thin. **Never reimplement taint logic inside a rule** — extend the shared layer instead.

Security rules are **not** in `eslint.config.js`. They ship behind an opt-in
`configs.security` at `warn`, because a noisy security rule does not just get itself
disabled — it gets the whole shared config distrusted.

Hard rules for security work:

- Severity (impact if exploited) and confidence (how sure the analysis is) are separate axes.
  ESLint level follows from both: high+high = error, high+medium = warn, smell = warn/info.
- No autofix on security-sensitive code unless the transformation is provably safe. Prefer a
  suggestion, or diagnostic only.
- A function is never a sanitizer because it is *named* `sanitize`, `clean`, `escape`, or
  `validate`. Sanitizers are explicit registry entries.
- False positives are the failure mode that kills adoption. A rule that is technically right and
  practically noisy is not shippable. The metric is useful findings ÷ false-positive burden.
- Every security claim in docs needs a primary source (OWASP, CWE, official library docs).
  Never invent a citation.
- Rule docs must state limitations honestly. Static analysis does not prove absence of a
  vulnerability.

## Specialist agents

`.claude/agents/` defines the security team: `owasp-orchestrator` (coordinator),
`owasp-researcher`, `sast-architect`, `rule-specialist`, `framework-specialist`,
`cwe-taxonomist`, `adversarial-tester`, `false-positive-analyst`, `security-reviewer`.
The reviewer can reject an implementation; a rejected rule does not ship.

## Commits

Coherent and scoped. `feat(security): …`, `test(sql): …`, `docs(rules): …`.
Never mix an unrelated refactor into a rule implementation.
