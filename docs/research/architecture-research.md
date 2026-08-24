# Security analysis architecture

Status: design. Nothing here is implemented yet.

Everything in the "verified" sections below was checked by running code against the ESLint in
`node_modules` (see [Verification method](#verification-method)), not from memory or docs alone.

> **Install drift found while researching this.** `package.json` declares `eslint: ^10.0.0` but
> `node_modules/eslint` is `9.39.4`. Verification numbers below come from 9.39.4. ESLint 10 is
> released ([v10.0.0, Feb 2026](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)) and the
> APIs this design depends on are unchanged in it; the v10 breaking changes that touch us are listed
> in [ESLint 10 deltas](#eslint-10-deltas). Run `pnpm install` before trusting a local benchmark.

## 1. The shape of the thing

```
rules/no-sql-injection/index.js        thin: find a sink node, ask the analysis, report
rules/no-unsafe-html/index.js          thin
... ~50 of these

machinery/security/
  finding.js     severity x confidence -> report or drop; path rendering; CWE/OWASP metadata
  registry.js    framework knowledge as data: sources, sinks, sanitizers, taint kinds
  taint.js       per-file analysis object, cached per SourceCode, demand-driven

                       consumed by all rules
  rule ---> taint.analyze(sourceCode).taintOf(node) ---> TaintValue | null
                                |
                                +-- registry.js (data lookups)
                                +-- eslint-scope ScopeManager (given to us by ESLint)
                                +-- @eslint-community/eslint-utils (findVariable, getStaticValue,
                                    getStringIfConstant, getPropertyName, ReferenceTracker)
```

Three files. No `machinery/security/index.js` barrel — rules require what they use, like every other
rule in this repo requires `machinery/ast` directly. No base-rule class, no rule factory: a rule
that is three lines of visitor plus one `report` call does not need a framework.

## 2. What ESLint gives us for free

### 2.1 One traversal, shared by every rule

`Linter#runRules` calls `sourceCode.traverse()` **once** (`node_modules/eslint/lib/linter/linter.js:1083`)
and dispatches each step to every rule's listeners. Fifty security rules with `CallExpression`
visitors cost one traversal, not fifty.

**Consequence for us:** the expensive thing is not "visiting nodes". It is doing per-node analysis
work fifty times over. That is what the cache in §5 exists to prevent, and it is the *only* thing it
needs to prevent.

### 2.2 `node.parent` is fully populated before the first visitor fires — verified

`SourceCode#traverse()` assigns `node.parent = parent` for the whole AST while materialising
traversal steps (`source-code.js:1348-1350`), and the Linter materialises all steps before running
any rule. Probed directly: at `Program` **enter**, a `VariableDeclaration` five levels deep already
had `parent === BlockStatement`.

So we may walk `parent` chains on nodes we have not been handed and that traversal has not reached
yet. This is what makes backward taint resolution possible at all — see
`docs/research/taint-analysis-research.md` §4.

Caveat worth writing down: the docs describe `parent` as available on the node you were given.
Whole-AST eager population is an implementation detail (it holds in 9.39.4 and 10.x because
`traverse()` is the step generator). `SourceCode#getAncestors` reads the same `parent` chain
(`source-code.js:922`), so it offers no extra safety — it is a convenience, not a guarantee.
We depend on the behaviour; §7 has the test that pins it.

### 2.3 Scope analysis is complete and position-independent

`sourceCode.scopeManager` is fully built at parse time. `sourceCode.getScope(node)` works for any
node at any point in traversal — probed at `Program` enter on a deep node, returned the correct
`function` scope. `getAncestors` likewise.

`ScopeManager` / `Scope` / `Variable` / `Reference` / `Definition` semantics we rely on
([official interface docs](https://eslint.org/docs/latest/extend/scope-manager-interface)):

| Thing | What we use it for |
| --- | --- |
| `Scope.references: Reference[]` | building the identifier -> reference index (§5.2) |
| `Reference.resolved: Variable \| null` | identifier -> declaration. `null` means the binding is not in this file: import, global, or typo. That `null` is our cross-file boundary marker. |
| `Reference.writeExpr` | the assigned expression — the backbone of backward resolution |
| `Reference.init: boolean` | distinguishes `let x = t` from a later `x = t` |
| `Reference.isReadWrite()` | detects `+=` (see the trap below) |
| `Variable.defs: Definition[]` | `def.type` in `{Variable, Parameter, ImportBinding, FunctionName, ClassName, CatchClause, ImplicitGlobalVariable}`; `def.name` is the binding `Identifier`, which is our entry point into destructuring patterns |
| `Variable.references` | all reads and writes — how we enumerate call sites in phase 2 |
| `Scope.variableScope` | the enclosing function, for "same-function" propagation |
| `ScopeManager.getDeclaredVariables(node)` | leaf bindings of a declaration, including through nested destructuring |

**Verified trap — `writeExpr` on compound assignment.** For:

```js
let q = 'SELECT ... ' + id   // ref 1
q += ' LIMIT 1'              // ref 2
db.query(q)                  // ref 3
```

the three references are:

| # | `init` | `isWrite` | `isRead` | `writeExpr` |
| --- | --- | --- | --- | --- |
| 1 | `true` | yes | no | `BinaryExpression` |
| 2 | `false` | yes | yes | `Literal` (`' LIMIT 1'`) — **the RHS only** |
| 3 | — | no | yes | `undefined` |

Naively reading "the last write" for `q` yields a string literal and misses the injection entirely.
Compound assignment must be handled as `value = previous ⊕ writeExpr`, keyed on `isReadWrite()`.
This is the single most likely place to introduce a silent false negative.

**Verified trap — `getScope(Program)` returns the *global* scope, not the module scope.** For
`sourceType: 'module'`, module-level bindings live in `globalScope.childScopes[0]` (type `module`).
`findVariable(sourceCode.getScope(programNode), 'someModuleLevelConst')` returns `null`. Use
`sourceCode.getScope(node)` for a node *inside* the module, or `globalScope.childScopes[0]`.

### 2.4 `getDeclaredVariables` and destructuring — verified

For `const { query: { id = '0', name: nm }, ...rest } = req`, `getDeclaredVariables(decl)` returns
exactly the leaf bindings `[id, nm, rest]`. Intermediate pattern keys (`query`) are not bindings.

To recover the *member path* a binding came from, walk `def.name.parent` upward. This runs and was
verified against nested object patterns, array patterns with holes, rest elements, defaults, and
array-destructured parameters:

```js
function resolvePatternPath(identifier) {
  const path = []
  let node = identifier
  let parent = node.parent

  while (parent) {
    if (parent.type === 'AssignmentPattern' && parent.left === node) { /* default value, transparent */ }
    else if (parent.type === 'ObjectPattern') { /* transparent */ }
    else if (parent.type === 'Property' && parent.value === node) path.unshift(getPropertyName(parent) ?? '*')
    else if (parent.type === 'ArrayPattern') path.unshift(String(parent.elements.indexOf(node)))
    else if (parent.type === 'RestElement') path.unshift('...')
    else if (parent.type === 'VariableDeclarator' && parent.id === node) return { root: parent.init, path }
    else if (parent.type === 'AssignmentExpression' && parent.left === node) return { root: parent.right, path }
    else if (isFunctionNode(parent)) return { root: parent, path, paramIndex: parent.params.indexOf(node) }
    else return { root: null, path, stoppedAt: parent.type }

    node = parent
    parent = parent.parent
  }

  return { root: null, path }
}
```

Verified output: `id -> {root: req, path: ['query','id']}`, `nm -> ['query','name']`,
`rest -> ['...']`, `c` from `const { a: { b: { c } } } = req.deep -> {root: req.deep, path: ['a','b','c']}`,
`function f(req, [a, b])` -> `b -> {root: f, path: ['1'], paramIndex: 1}`.

This one function subsumes "destructuring incl. nested/renamed/defaulted" from the phase-1 list.
`isFunctionNode` already exists in `machinery/ast.js` — reuse it.

### 2.5 Visitor lifecycle and ordering

- Keys without `:exit` fire on descent, with `:exit` on ascent.
- Order across rules for the same node is registration order, which is config order. **Never depend
  on it.** Any rule that needs whole-file information must do its work in `Program:exit`.
- `*` selector and `esquery` selectors work but a plain node-type key is cheaper. Rules match sink
  shapes with plain keys.
- ESLint 10 tracks JSX references in scope analysis (new). Relevant for JSX-sink rules
  (`dangerouslySetInnerHTML`): a JSX identifier now resolves like any other.

### 2.6 Sharing state within a lint run

Three mechanisms exist; we use exactly one.

| Mechanism | Verdict |
| --- | --- |
| `context.settings` | **Use.** Read-only config, shared by every rule. One namespace: `settings['@kaliber/security']`. This is where thresholds, framework selection, and custom registry entries live — not in per-rule `options`, because fifty rules must not each carry the same schema. |
| Module-level `WeakMap` keyed on `SourceCode` | **Use.** This is the analysis cache (§5). |
| Module-level mutable state keyed on filename | **Reject.** Unbounded, wrong across concurrent Linter instances, and stale under `--fix`. |

Verified: `context.sourceCode` is the **same object identity** for every rule in a single file's lint
pass. That is the whole basis of the cache.

## 3. typescript-eslint type services

### 3.1 What they actually give you

`getParserServices(context)` (or, without the dependency, `context.sourceCode.parserServices` —
confirmed present, defaults to `{}` at `source-code.js:488`) returns:

- `program: ts.Program | null`
- `esTreeNodeToTSNodeMap` / `tsNodeToESTreeNodeMap`
- `getTypeAtLocation(node)` / `getSymbolAtLocation(node)` when type checking is on

For this plugin the useful capabilities are, in order of value:

1. **String-ness narrowing.** `sink(x)` where `x: number` cannot be an injection. Kills a whole
   class of false positive that no amount of AST cleverness fixes.
2. **Cross-file symbol resolution.** `getSymbolAtLocation` -> declaration in another file. Lets us
   tell "this import is `lodash.escape`" from "this import is our own `escape` that does nothing".
3. **`any` detection.** An `any`-typed sink argument is a confidence *reducer*, not a finding.

What they do **not** give: cross-file taint. A type says a function returns `string`. It does not say
that string came from `req.query`. §4.

### 3.2 Cost — concretely

typescript-eslint's own guidance: *"if you're using type-aware linting, your lint times should be
roughly the same as your build times"* ([performance
troubleshooting](https://typescript-eslint.io/troubleshooting/typed-linting/performance/)). That is
the number to plan around: typed linting ≈ `tsc --noEmit` on the same project, *added to* the
untyped lint time.

Order of magnitude for a ~1000-file TS project where `tsc --noEmit` takes ~20s and untyped ESLint
takes ~2s: typed linting lands around 20-25s. Roughly 10x. The cost is dominated by program
construction, not by our rules — which also means it is a per-run fixed cost that does not scale
with how many typed rules we ship.

Config shape and its cost:

- `projectService: true` — recommended, uses TS's own project service (the thing your editor uses).
  Handles files outside any tsconfig via `allowDefaultProject`. Avoids the classic
  `include: ['**/*']` blowup.
- `project: ['./tsconfig.json']` — legacy. Wide `include` globs are the number-one cause of
  pathological typed-lint times; `['./packages/*/tsconfig.json']` beats `['./**/tsconfig.json']`.
- `TIMING=1` and `--stats` for attribution. Note the documented artefact: *the first type-aware rule
  will almost always seem the slowest* because it pays for program construction. Benchmark rules
  individually.

### 3.3 Optional dependency — and the upstream warning we are honouring

Decision: **the plugin never `require`s anything from typescript-eslint.** We read
`context.sourceCode.parserServices` and duck-type. No new dependency, no peer dependency, no
`optionalDependencies`. If the consumer has typed linting configured, the object is populated; if
not, it is `{}`.

But typescript-eslint explicitly advises *"against changing rule logic based solely on whether
`services.program` exists"* ([custom rules
docs](https://typescript-eslint.io/developers/custom-rules/)), because a misconfigured project then
silently gets different results. That warning is correct and we follow it:

```js
// machinery/security/finding.js
function typeInformation(context) {
  const { typeInformation = 'off' } = context.settings['@kaliber/security'] ?? {}
  if (typeInformation === 'off') return null

  const services = context.sourceCode.parserServices
  if (services?.program) return services
  if (typeInformation === 'require') throw new Error(
    '@kaliber/security: settings.typeInformation is "require" but no TypeScript program is ' +
    'available. Configure typescript-eslint `projectService: true`, or set typeInformation to "off".'
  )
  return null
}
```

Three states, explicit: `'off'` (default — never use types, results are reproducible everywhere),
`'on'` (use if present, degrade quietly), `'require'` (fail loudly if absent). Degradation is opted
into, never inferred.

**Phase 1 uses no type information at all.** Every rule must be correct and useful with
`typeInformation: 'off'`. Types are a precision upgrade layered on later, and only where we can name
the false positive they remove.

## 4. The per-file execution model, and what it forbids

ESLint hands a rule one file: one `SourceCode`, one `ScopeManager`, `context.filename`. There is no
API to ask what an imported function does. `Reference.resolved === null` or
`def.type === 'ImportBinding'` is where our knowledge stops, full stop.

So cross-file taint inside ESLint is **not possible in general**. Not hard — not possible. The three
things people try:

1. **Type services.** Gets you cross-file *declarations*, not cross-file *taint*. Knowing
   `getUserInput(): string` tells you nothing about trust. Could we walk the imported function's AST
   via `program.getSourceFile()`? Technically yes. Rejected: unbounded work per file, no cache
   invalidation story, and it makes every rule's result depend on a TS config the plugin does not
   control. This is how you get a plugin that is fast in CI and unusable in an editor.
2. **Out-of-band pre-pass** writing a whole-program taint index to disk for rules to read. Rejected:
   ESLint gives us no hook that runs before rules across all files; the index is stale the moment a
   file changes; editors lint single files on keystroke; and the failure mode is *silently wrong
   results*, which is worse than no results.
3. **Accept the boundary.** Chosen.

### The honest fallback

A finding requires the source and the sink to both be visible in one file, **or** the boundary to be
declared registry data.

| Situation | Behaviour |
| --- | --- |
| Source and sink in the same file | Full analysis. Confidence per taint doc §7. |
| Sink argument comes from an import in `registry.sources` (e.g. a known framework request object) | Treated as a source. Registry data, so it is reviewable. |
| Sink argument comes from an import in `registry.sanitizers` | Sanitized for the declared kinds. |
| Sink argument comes from an unknown local import | **Unknown**, not tainted. No report — unless the sink is dangerous with *any* non-literal argument (`child_process.exec`), which is a separate, source-independent rule. |
| Sink argument is a literal or constant-foldable | Untainted. Verified: `getStaticValue` returns a value. |

The last two rows are the whole compromise. We do not report on unknown provenance, so we miss real
bugs that cross a module boundary. That belongs in every rule's readme under limitations, stated
plainly. False negatives are a cost; false positives are an extinction event.

The one thing that partially reclaims cross-file coverage without a whole-program pass:
**framework entry points as sources.** An exported Next.js route handler's first parameter *is*
untrusted input, decidable from one file. Most real cross-file taint in a web codebase starts at an
entry point that is itself syntactically identifiable. That is registry work, not analysis work.

## 5. Module boundaries and public APIs

### 5.1 `machinery/security/finding.js`

Severity (impact if exploited) and confidence (how sure the analysis is) are separate axes; the
report decision follows from both.

```js
module.exports = {
  report,
  confidenceBucket,
  describePath,
  typeInformation,
  settings,
}

/**
 * Report unless the severity/confidence combination is below the configured floor.
 * @returns {boolean} whether it reported
 */
function report(context, { node, messageId, data, severity, confidence, cwe, path })

/** @returns {'high'|'medium'|'low'} */
function confidenceBucket(confidence)

/** 'req.query.id -> id -> sql -> db.query(sql)' — for the `flow` message placeholder */
function describePath(sourceCode, path)

/** @returns {object|null} the TS parser services, per settings. See §3.3 */
function typeInformation(context)

/** Merged defaults + settings['@kaliber/security'] */
function settings(context)
```

Two distinct mechanisms, and conflating them is a category error worth naming:

- **Rule default severity** (`error` / `warn`) is a property of the rule and lives in
  `eslint.config.js`. `severity: 'high'` + a rule whose findings are typically high-confidence ->
  `error`. A smell rule -> `warn`. This is a config-authoring decision, made once per rule.
- **Per-finding confidence** is a property of the analysis and decides whether to report *at all*,
  and how the message is worded. Below `minConfidence` (default `0.5`): drop silently. This is the
  runtime knob.

`report` also appends the flow path to `data.flow` so message templates can include it. Rules never
format paths themselves.

### 5.2 `machinery/security/registry.js`

Framework knowledge as **data**. If adding support for a framework means editing a `switch`, the
design has failed.

```js
module.exports = {
  sources,      // TaintSource[]
  sinks,        // TaintSink[]
  sanitizers,   // TaintSanitizer[]
  propagators,  // method-name propagation table (Array.join, String.concat, ...)
  nonPropagatingProperties, // ['length', 'size', ...] — reading these yields a non-string

  traceMap,     // derived: ReferenceTracker trace map for every module-rooted entry
  find,
}

/**
 * @param {'source'|'sink'|'sanitizer'} category
 * @param {{ module?: string, name?: string, global?: string, path?: string[] }} key
 * @returns {object|null}
 */
function find(category, key)
```

Entry shapes:

```js
// source
{ id: 'express.request.query', root: { param: { name: /^(req|request)$/, index: 0 } },
  path: ['query'], confidence: 0.8, cwe: ['CWE-20'] }
{ id: 'browser.location.search', root: { global: 'location' }, path: ['search'], confidence: 0.9 }

// sink
{ id: 'node.child_process.exec', root: { module: 'child_process', name: 'exec' },
  argument: 0, requires: 'shell', severity: 'high', cwe: 'CWE-78' }

// sanitizer
{ id: 'mysql.escape', root: { module: 'mysql2', name: 'escape' }, argument: 0, clears: ['sql'] }
{ id: 'global.Number', root: { global: 'Number' }, argument: 0, clears: ['*'] }
```

Module- and global-rooted entries are resolved with `ReferenceTracker` from
`@eslint-community/eslint-utils`, which handles `import { exec }`, `import * as cp`,
`const { exec } = require(...)`, and aliasing correctly. Verified working for ESM.

**Verified caveat:** `ReferenceTracker#iterateCjsReferences` needs `require` to resolve to a
*global variable*. Under `sourceType: 'module'` with no Node globals configured it silently finds
nothing. The analysis must call both `iterateEsmReferences` and `iterateCjsReferences`, and the
shipped config must declare Node globals for server-side files. Silent zero results is exactly the
kind of failure that ships.

Consumers extend the registry through `settings['@kaliber/security'].registry`, merged by `find`.
No plugin API, no registration function: it is a list, users append to it.

### 5.3 `machinery/security/taint.js`

```js
module.exports = { analyze }

/**
 * The per-file analysis. Cached; calling this repeatedly is free.
 * @param {SourceCode} sourceCode
 * @param {object} options  from finding.settings(context)
 * @returns {Analysis}
 */
function analyze(sourceCode, options)

// Analysis:
{
  /** Is this expression tainted? null = no, or unknown (indistinguishable by design). */
  taintOf(node),                  // (Node) => TaintValue | null

  /** Registry sink matching a call/member node, if any. */
  sinkAt(node),                   // (Node) => TaintSink | null

  /** Registry source matching this node, if any. Rules rarely need this; taintOf uses it. */
  sourceAt(node),                 // (Node) => TaintSource | null

  /** Reference for an Identifier, O(1). Replaces scope.references.find. */
  referenceFor(identifier),       // (Node) => Reference | null

  stats,                          // { resolved, cacheHits, bailouts } — see §6.3
}
```

Three methods and an index. That is the entire public surface fifty rules need. A typical rule:

```js
const { analyze } = require('../../machinery/security/taint')
const { report, settings } = require('../../machinery/security/finding')

create(context) {
  const analysis = analyze(context.sourceCode, settings(context))

  return {
    CallExpression(node) {
      const sink = analysis.sinkAt(node)
      if (!sink || sink.requires !== 'sql') return

      const argument = node.arguments[sink.argument]
      if (!argument) return

      const taint = analysis.taintOf(argument)
      if (!taint || taint.sanitizedFor.has('sql') || taint.sanitizedFor.has('*')) return

      report(context, {
        node: argument,
        messageId: 'sqlInjection',
        severity: sink.severity,
        confidence: taint.confidence,
        cwe: sink.cwe,
        path: taint.path,
      })
    },
  }
}
```

Note what is *not* there: no traversal, no scope walking, no AST pattern matching beyond the sink
node type. That is the test for whether the boundary is drawn correctly. If a rule starts walking
`parent` chains to figure out where a value came from, the analysis is missing a capability and
`taint.js` is where it goes.

### 5.4 Why not more modules

- No `source.js` / `sink.js` / `sanitizer.js` split: they are three arrays and one `find`.
- No `analysis.js` separate from `taint.js`: the analysis object *is* the taint analysis.
- No `severity.js`: it is one function and one table in `finding.js`.
- No `cache.js`: it is a `WeakMap` and four lines.
- No abstract `Analyzer` interface: there is one analyzer. An interface with one implementation is a
  defect.

## 6. The shared analysis cache

### 6.1 Mechanism

```js
const cache = new WeakMap()

function analyze(sourceCode, options) {
  const cached = cache.get(sourceCode)
  if (cached) { cached.stats.cacheHits++; return cached }

  const analysis = createAnalysis(sourceCode, options)
  cache.set(sourceCode, analysis)
  return analysis
}
```

That is the whole thing. Why it is correct rather than merely convenient:

- **The key is right.** Verified: every rule in one file's lint pass receives the identical
  `SourceCode` object. Fifty rules, one entry.
- **Invalidation is structural, not managed.** ESLint constructs a new `SourceCode` for every parse.
  Edit the file, lint again -> new object -> cache miss -> fresh analysis. There is no staleness
  window because there is no shared mutable key. Under `--fix`, ESLint re-parses up to 10 times; each
  pass gets its own entry, automatically. **No TTL, no size cap, no manual `invalidate()`.** Anything
  we could write here would be a bug we could write here.
- **Memory is bounded by the GC.** When ESLint drops the `SourceCode`, the analysis becomes
  unreachable and is collected. A `Map<filename, analysis>` would leak the whole AST of every file
  linted in the process, which on a 3000-file run is hundreds of MB.
- **`options` is not part of the key**, deliberately. Settings are per-config-section, and every rule
  in one file sees the same section. If that ever stops being true, the first rule's options win —
  which is why `createAnalysis` must never mutate `options`.

### 6.2 Why there is no extra traversal at all

Stronger than "one shared traversal": we do **zero** extra AST traversals.

- **Sinks** are found by each rule's own visitor, riding ESLint's single traversal (§2.1). Free.
- **Sources** are found by backward resolution *from* a sink, so only the nodes on a real dataflow
  path are ever examined.
- **The reference index** is built by iterating `scopeManager.scopes[].references` — arrays ESLint
  already populated at parse time. O(references), no AST walk, no `getScope` calls.
- **Registry module/global lookups** use `ReferenceTracker`, which also walks references, not the
  AST.

Everything is lazy. `createAnalysis` allocates four empty Maps and returns; nothing is computed until
a rule calls `taintOf`. A file with no sinks costs approximately nothing. This matters because most
files in a real project contain no sinks at all.

The three memo tables inside the analysis:

```js
function createAnalysis(sourceCode, options) {
  const taintCache = new Map()   // Node -> TaintValue | null   (null memoised too)
  const inProgress = new Set()   // recursion guard, see taint doc §6
  let referenceIndex = null      // Map<Identifier, Reference>, built on first referenceFor
  let trackedNodes = null        // Map<Node, registryEntry>, built on first sinkAt
  // ...
}
```

`taintCache` memoising `null` is load-bearing: the common case is "not tainted", and re-deriving that
fifty times for the same identifier is exactly the cost we are avoiding.

### 6.3 Instrumentation

```js
if (process.env.KALIBER_SECURITY_STATS) process.on('exit', () => console.error(analysisStats))
```

Counters: `analyses` created, `cacheHits`, `nodesResolved`, `bailouts` by reason (`maxHops`,
`recursion`, `unknownImport`, `maxCallDepth`). Five lines, and it is the difference between "the
cache works" and "we believe the cache works". Off unless the env var is set.

## 7. Performance strategy

### 7.1 Measured baseline

Measured on this machine (Node 24.15, ESLint 9.39.4, 5 runs after 3 warmups, synthetic files of
repeated request-handler functions):

| File | Parse + lint, 0 rules | + 1 rule visiting every node | + 1 rule scope-resolving every `Identifier` |
| --- | --- | --- | --- |
| 15 KB, 7.6k nodes | 16.3 ms | 15.6 ms (noise) | 13.6 ms (noise) |
| 63 KB, 30k nodes | 48.9 ms | +3.1 ms (+6%) | +6.5 ms (+13%) |
| 251 KB, 122k nodes | 196.3 ms | +3.7 ms (+2%) | +10.5 ms (+5%) |

Parse dominates. A rule that touches every node in a 122k-node file costs 2% of the run. Full scope
resolution of every identifier costs 5%.

**This is the argument for the cache, quantified.** 5% each is fine. Fifty rules each doing their own
scope resolution is 50 x 10.5 ms = 525 ms on top of a 196 ms baseline — 3.7x, unshippable. One shared
analysis is 10.5 ms worst case, and demand-driven resolution touches far fewer nodes than "every
identifier" because it starts from sinks.

(The scope-resolving probe used `scope.references.find(r => r.identifier === node)`, which is O(refs)
per lookup. `referenceFor`'s index removes that quadratic term; the 10.5 ms is therefore a
pessimistic ceiling.)

### 7.2 Budgets

Falsifiable claims. If a benchmark breaks one, the design is wrong, not the benchmark.

| Claim | Budget |
| --- | --- |
| A file with no registry sinks | < 1 ms added, total, for all security rules |
| A file with sinks but no findings | < 5% of that file's baseline lint time |
| A file with findings | < 15% of baseline |
| Whole-project lint time, all ~50 security rules on, `typeInformation: 'off'` | < 10% over the same run with the rules off |
| Peak RSS increase | < 5% (WeakMap, no retained ASTs) |
| Worst-case single file (pathological nesting, 200-hop chains) | bounded by `maxHops` x `maxCallDepth`, not by file size |

`typeInformation: 'on'` is explicitly excluded from these. That cost belongs to typescript-eslint and
is measured separately (§3.2).

### 7.3 Benchmark plan

Three corpora, real code, checked into a sibling directory (never into the published package):

| Tier | Target | Sourced from |
| --- | --- | --- |
| small | ~40 files, ~200 KB | this repo |
| medium | ~500 files, mixed TS/TSX | a real kaliber project, vendored or referenced by path |
| large | ~3000 files | a public TS monorepo, pinned by commit |

Method:

1. `eslint --stats --format json` gives per-rule, per-file timing. Two runs per corpus: security
   rules off, security rules on. Diff is our cost. `--no-cache` always; ESLint's file cache would
   measure the cache, not us.
2. `TIMING=1` for the per-rule leaderboard, as a cross-check on `--stats`.
3. `KALIBER_SECURITY_STATS=1` for cache hit rate and bailout reasons. A cache hit rate below
   (rules - 1) / rules means the key is wrong.
4. `--max-old-space-size` unset; record peak RSS via `/usr/bin/time -l`.
5. Medium corpus also run with `typeInformation: 'on'` + `projectService: true`, alongside
   `tsc --noEmit` on the same corpus, to confirm the "lint time ≈ build time" relationship holds for
   us and to have a number to quote in the readme.

Committed as `scripts/bench-security.js` (Node, no framework), printing a table. Run before any PR
that touches `taint.js`. Not in CI initially — timing tests on shared runners are noise generators;
add a CI gate only once we have variance data.

Correctness harness alongside it: a fixture corpus of known-vulnerable and known-safe snippets, each
asserting the expected confidence value, not just report/no-report. Confidence is our
false-positive control (taint doc §7) and it must be regression-tested numerically, or the penalty
table drifts. Uses `machinery/test`'s `test()`, run by `node --test`.

Plus one test that pins the assumption from §2.2 — a rule asserting `parent` is populated on an
un-traversed node at `Program` enter. If a future ESLint makes traversal steps lazy, that test fails
loudly instead of the whole analysis going quietly blind.

### 7.4 Dependency decision

**Add `@eslint-community/eslint-utils` as a direct dependency.** AGENTS.md requires a real
justification; this is one:

- It is already in the tree as ESLint's own dependency (`eslint@9.39.4` -> `^4.8.0`, resolved 4.9.1),
  maintained by the ESLint community org, and moves in lockstep with ESLint.
- It provides five primitives this design uses directly: `findVariable`, `getStaticValue`,
  `getStringIfConstant`, `getPropertyName`, `ReferenceTracker`. Hand-rolling those is several hundred
  lines of subtle code — `getStaticValue` alone is a constant-folding evaluator, and
  `ReferenceTracker` is the import-aliasing logic every SAST tool gets wrong.
- `getStaticValue` is load-bearing beyond convenience: it is our cheapest and most precise
  false-positive filter. Verified — for `'ls ' + 'x'` it returns `{value: 'ls x'}`; for anything
  touching `req` it returns `null`. Non-null means constant means untainted, decided in one call.
- It must be *declared*, not relied on transitively. It currently resolves from the repo root only
  because of hoisting; a consumer with a strict `node_modules` would get a module-not-found from a
  published package.

No other new dependency. In particular: no `typescript`, no `@typescript-eslint/*`, no graph library,
no immutable-collections library.

## 8. ESLint 10 deltas

From the [v10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0), what touches
this design:

- Removed `context.getScope()`, `context.getSourceCode()`, `context.getFilename()`,
  `context.getCwd()`, `context.parserOptions`, `context.parserPath`. All new code uses
  `context.sourceCode` / `context.filename` / `context.languageOptions`. Nothing in this design uses
  a removed API.
- Removed `SourceCode#getJSDocComment`, `getTokenOrCommentBefore/After`, `isSpaceBetweenTokens`.
  Unused here.
- **JSX references are now tracked in scope analysis.** Directly relevant: rules for
  `dangerouslySetInnerHTML` and JSX-attribute sinks can resolve JSX identifiers through the normal
  `Reference` machinery. Also means `Scope.references` may contain `JSXIdentifier` nodes — the
  reference index must not assume `Identifier`.
- `Program` node range now spans leading/trailing trivia. Only matters if we ever report on
  `Program`; we do not.
- Config lookup starts from each linted file's directory. Consumer concern, not ours.
- Node >= 20.19. Fine.
- Fixer `text` must be a string. We ship no fixers (§9).

## 9. Out of scope

Each with the reason it is out, so the next person does not relitigate it.

| Excluded | Why |
| --- | --- |
| **Cross-file / whole-program taint** | Impossible inside ESLint's per-file model (§4). The alternatives are silently-wrong or unusable in an editor. |
| **Path- and flow-sensitivity** (branch conditions, reachability, kill-on-reassign) | Needs a CFG + join lattice + fixpoint. Injection bugs are rarely branch-dependent; the machinery costs more than it buys. Priced instead as a confidence penalty. |
| **Loop fixpoints** (accumulate-in-loop, `arr.push` in a loop) | Requires iterating to a fixpoint over a lattice. Handled as "unknown", i.e. no report. |
| **Heap / property-write aliasing** (`o.x = tainted; sink(o.x)`) | Needs points-to analysis. Genuinely hard, and the false-positive rate of approximating it is unacceptable. Taint doc §5. |
| **Container element taint** (arrays, `Map`, `Set`) | Same reason. `Array.join` on a tainted array is handled by name only, at reduced confidence. |
| **Promise / async propagation** (`await`, `.then` chains) | Deferred to phase 3. `await x` unwrapping is trivial and *is* in phase 1; `.then(cb)` callback-parameter propagation is not. |
| **Class instance state** (`this.x = tainted`) | Heap analysis again. |
| **`eval`, dynamic `Function`, computed identifiers** | Not statically decidable. Flagged as a finding on their own merit by a separate rule; never analysed through. |
| **Autofix on security findings** | AGENTS.md: no autofix unless provably safe. Sanitizer insertion is never provably correct without types and context. Suggestions only, where the transformation is mechanical. |
| **Secret / credential scanning** | Regex-over-text domain, not AST. Different tool (`gitleaks`, `trufflehog`). Adding it here means an entropy engine and a false-positive problem unrelated to everything else in this file. |
| **Dependency CVEs** | `pnpm audit` / Dependabot. Not a linter's job. |
| **Config, IaC, Dockerfile scanning** | Not JavaScript. |
| **A custom parser or our own scope analyser** | ESLint's is correct, maintained, and free. |
| **Severity/CVSS scoring beyond high/medium/low** | Three buckets map onto ESLint's two levels plus "drop". More precision than the output can express is decoration. |
| **A rule-authoring DSL or base class** | Fifty thin rules do not need one. §5.3 shows the whole rule. |

## Verification method

Claims marked *verified* were checked by running throwaway scripts against
`node_modules/eslint@9.39.4` in this repo (`new Linter().verify(...)` with probe rules), plus reading
`node_modules/eslint/lib/linter/linter.js` and `.../source-code/source-code.js` at the cited lines.
Probe scripts were deleted after use; the assertions worth keeping become tests per §7.3.

Docs consulted:
[Scope manager interface](https://eslint.org/docs/latest/extend/scope-manager-interface) ·
[Custom rules](https://eslint.org/docs/latest/extend/custom-rules) ·
[Migrate to v10](https://eslint.org/docs/latest/use/migrate-to-10.0.0) ·
[v10.0.0 release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) ·
[typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/) ·
[typed linting performance](https://typescript-eslint.io/troubleshooting/typed-linting/performance/) ·
[typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/)
