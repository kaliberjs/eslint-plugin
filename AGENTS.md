# AGENTS.md

Guidance for AI agents working in `@kaliber/eslint-plugin`: kaliber's house rules for ESLint 10
flat config, consumed by real projects. Read a neighbouring rule before writing a new one.

## Layout

```
index.js                 plugin entry; every rule is registered here
eslint.config.js         the shipped shared config
eslint.config.test.js    proves the shared config enables each rule group
machinery/               shared helpers: ast, test, docsUrl, filename, word, static-value
machinery/<domain>.js    domain helpers, e.g. firebase-rules.js
rules/<rule-name>/       index.js + test.js + readme.md
rules/core/              tests pinning ESLint core rule behaviour
rules/third-party/       tests pinning third-party plugin rule behaviour
rules-overview.md        one row per rule
```

## Code

- CommonJS, no semicolons, two-space indent, single quotes, trailing commas in multiline.
- Lines stay within 100 columns. Wrap long strings with `+`, imports with destructuring.
- Named `function` declarations, not functions bound to a `const` or a property
  (`const fold = node => …`). At module scope they go below the export; inside a function, after
  its `return`. Inline callbacks (`.map(rule => …)`) stay arrows.
- Read like prose: conditions become named predicates (`canDelete`, `isOwnerField`), regexes
  become named constants (`writesSomething`), variables get domain names, never `x` or `fn`.
  Guard clauses first, then the happy path.

## Reuse before writing

- Check `machinery/ast.js` first (`getPropertyName`, `isFunctionNode`, …). Add a helper there
  when it is generic AST knowledge.
- Fold static values with `machinery/static-value.js`, not a new evaluator.
- Rules about one domain share a domain module that owns its vocabulary. Each rule then holds
  only its check. `machinery/firebase-rules.js` is the model: `forEachAccessRule(context, visit)`
  hands every rule a folded `.read`/`.write` with its path, fields and ancestors, and
  `optionsSchema(extra)` shares the common options.
- Derive domain facts from the platform's own documented rules instead of hardcoding lists, and
  link the source beside the code. Example: `isDataKey` follows from Firebase's key rule (keys
  can't contain `.` or `$`) rather than listing `.read`, `.write`, ….

## JSDoc

This repo uses JSDoc on new rules and machinery, overriding any no-comments preference:

- `@param` on every function; `@type {import('eslint').Rule.RuleModule}` on each rule module.
- `@returns` only when inference can't give the type from the function's own values: a type
  guard, a recursive function, or a result wider or narrower than what the body returns.
  Well-typed parameters usually make the return type automatic.
- Types from `eslint` and `estree`, not hand-written shapes. Type guards
  (`@returns {node is X}`) where they narrow. `@typedef`s at the bottom of the file.
- `@example` where behaviour isn't obvious from the name.
- Check with a throwaway `tsc` outside the repo (`allowJs`, `checkJs`, `strict`); the repo has no
  TypeScript setup and doesn't get one.

## Adding a rule

1. `rules/<name>/index.js` with `meta.docs.description` (one line) and
   `url: docsUrl(__dirname)`; a real JSON `schema` for options.
2. `rules/<name>/test.js` via `machinery/test`. Tests are written reductions of the shape, never
   code copied from client projects (this repo is public).
3. `rules/<name>/readme.md`, short: one-line summary (with CWE/OWASP links for security rules),
   `## Rule details`, one ✗/✓ example, `## Options`, `## Limitations`.
4. Register in `index.js`, enable in `eslint.config.js`, extend `eslint.config.test.js`, add a
   row to `rules-overview.md` and the README's rule table. `rules/rule-names.test.js` checks
   every rule is reachable; a rule name never contains `/`.

## Dependencies

No new dependencies, devDependencies included, without asking. Prefer the stdlib, what's
installed, and the platform's documentation as proof.

## Verify

```
pnpm test   # node --test
pnpm lint   # eslint --config eslint.self.config.js .
```

- Break the rule on purpose (drop a guard) and confirm a test fails; a test that can't fail is
  removed or rewritten.
- For a new rule, lint the real codebases you have locally, read-only, and report hits and
  noise before shipping. Keep client names and findings out of commits and PRs.
- In a fresh worktree `pnpm install` may write `allowBuilds` placeholders into
  `pnpm-workspace.yaml`; revert them.
