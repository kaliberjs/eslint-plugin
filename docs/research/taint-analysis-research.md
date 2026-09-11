# Taint analysis design

Status: design. Companion to `architecture-research.md`, which covers the ESLint infrastructure this
builds on. Read §2.3 and §2.4 there first — the `Reference`/`writeExpr` semantics and the
`resolvePatternPath` walk are the foundation and are not repeated here.

Implementation target: `machinery/security/taint.js`, one file, public API
`analyze(sourceCode, options) -> { taintOf, sinkAt, sourceAt, referenceFor, stats }`.

## 1. Data model

Five shapes. Three are registry *data* (§1.1-1.3), two are analysis *results* (§1.4-1.5). Keeping
those two categories apart is the point: data is reviewable by a human who knows Express, results are
produced by code.

### 1.1 TaintSource — data

```js
// registry.js
{
  id: 'express.request.query',        // stable, appears in messages and tests
  root: { param: { name: /^(req|request)$/, index: 0, arity: [2, 3] } },
  path: ['query'],                    // member path from the root
  confidence: 0.75,                   // starting confidence, before any hop penalties
  cwe: ['CWE-20'],
  note: 'Express/Connect request object, identified by parameter name and handler arity',
}
```

`root` is one of:

| `root` | Matched by | Confidence range |
| --- | --- | --- |
| `{ module: 'next/headers', name: 'cookies' }` | `ReferenceTracker` | 0.9 - 0.95 — an import is unambiguous |
| `{ global: 'location' }` | `ReferenceTracker` | 0.9 |
| `{ param: { name: /.../, index, arity } }` | parameter-name heuristic | 0.6 - 0.75 |
| `{ export: { name: 'GET', path: /app\/.*\/route\.ts$/ } }` | export name + filename | 0.85 — framework entry point |

The `param` form is a heuristic and is priced as one. `function f(req)` where `req` is a Redis client
is a false positive waiting to happen, which is why the shape constraint (`arity`, and for Express
also a second parameter named `res`) is part of the entry and why the confidence ceiling is 0.75. It
lives in registry data so a consumer can tighten or drop it via
`settings['@kaliber/security'].registry` without a plugin change.

The `export` form is what partially reclaims cross-file coverage (architecture doc §4): an exported
Next.js route handler's first parameter is untrusted input, decidable from one file.

### 1.2 TaintSink — data

```js
{
  id: 'node.child_process.exec',
  root: { module: 'child_process', name: 'exec' },
  argument: 0,                        // which argument reaches the dangerous operation
  requires: 'shell',                  // the taint kind that must be cleared. See §6
  severity: 'high',
  cwe: 'CWE-78',
  owasp: 'A03:2021',
}
```

Member-rooted sinks (`el.innerHTML = x`, `dangerouslySetInnerHTML`) use
`root: { member: ['innerHTML'], operation: 'write' }` and omit `argument`.

`requires` is singular and mandatory. A sink that "requires general safety" is a sink whose author
has not thought about it.

### 1.3 TaintSanitizer — data

```js
{
  id: 'mysql2.escape',
  root: { module: 'mysql2', name: 'escape' },
  argument: 0,                        // sanitizes this argument; the return value is clean
  clears: ['sql'],                    // NOT ['html']. See §6
  confidence: 1,                      // some sanitizers are conditional; see below
}

{ id: 'global.Number',        root: { global: 'Number' },        argument: 0, clears: ['*'] }
{ id: 'global.encodeURIComponent', root: { global: 'encodeURIComponent' }, argument: 0, clears: ['url'] }
{ id: 'dompurify.sanitize',   root: { module: 'dompurify', name: 'sanitize' }, argument: 0,
  clears: ['html'], confidence: 0.9,
  note: 'confidence < 1: config options can disable escaping (ALLOWED_TAGS, RETURN_DOM)' }
```

`confidence` on a sanitizer is a *cap*, not a penalty: a sanitizer with `confidence: 0.9` means "if
this is the only thing between source and sink, we are 90% sure it is safe", so a finding that it
guards is reported at low confidence rather than dropped. Most sanitizers are 1.

Per AGENTS.md: a function is never a sanitizer because of its name. There is no name heuristic for
sanitizers anywhere in this design — not even a low-confidence one. `escape`, `clean`, `sanitize`,
`validate` are matched only as registry entries with a known `root`.

### 1.4 TaintValue — analysis result

What `taintOf(node)` returns.

```js
{
  source: TaintSource,                // the registry entry the flow started at
  sanitizedFor: Set(['sql']),         // kinds already neutralised on this path. See §6
  confidence: 0.62,                   // 0..1, source.confidence minus hop penalties. See §7
  path: [Hop, Hop, ...],              // source first, most recent last. See §1.5
}
```

`null` means "not tainted **or** unknown". Deliberately indistinguishable at the API boundary: both
mean "do not report", and a three-valued return would tempt rules into reporting on unknowns. The
distinction is recorded in `stats.bailouts` for debugging, not exposed.

`sanitizedFor` is a `Set` of kind strings, possibly containing `'*'`. Constructed fresh on every
propagation step; never mutated in place, because `taintCache` hands the same object to fifty rules.

There is **no** `kinds` field on TaintValue. That is the central modelling decision — see §6.

### 1.5 Hop — the flow path

```js
{
  node,                               // the AST node this hop happened at
  kind: 'template',                   // one of the PENALTY keys in §7
  label: 'sql',                       // short human text: variable name, property, or method
  penalty: 0.05,                      // what this hop cost, so the number is auditable
}
```

`path[0].node` is the source expression; the sink node is appended by `finding.report`. Rendering
lives in `finding.describePath`, never in a rule:

```js
function describePath(sourceCode, path) {
  return path.map(hop => hop.label || sourceCode.getText(hop.node)).join(' -> ')
}
// 'req.query.id -> id -> sql -> other -> db.query(other)'
```

Paths are truncated to `maxPathInMessage` (default 6) hops with an ellipsis in the middle; a 12-hop
path in an error message is noise. The full path stays on the TaintValue for tests to assert against.

Why record the path at all, given it costs an allocation per hop: it is the only way a developer can
tell a true positive from a false one in under a minute, and it is what makes the confidence number
reviewable rather than magic. Non-negotiable.

## 2. The resolution direction: backward. Decided.

`taintOf(node)` walks **backward** from a sink toward sources, on demand. There is no forward pass,
no whole-file taint table, no abstract interpretation over a CFG.

Reasons, in order of weight:

1. **Work is proportional to sinks, not statements.** A typical file has zero to three sinks and
   thousands of expressions. A forward pass computes an abstract value for every expression and then
   discards ~99.9% of them. Measured context (architecture doc §7.1): touching every identifier in a
   122k-node file with scope resolution costs ~10 ms; backward-from-sink touches tens of nodes.
   A file with no sinks costs nothing, and most files have no sinks.
2. **ESLint already did the hard part.** `ScopeManager` gives us resolved def-use chains at parse
   time: `Reference.resolved -> Variable.defs` and `Variable.references[].writeExpr`. A forward pass
   would reconstruct, statement by statement, the information we are handed for free. Building an
   environment map is duplicating `eslint-scope`.
3. **It matches the execution model.** A rule's visitor fires *at* the sink. Backward resolution
   answers immediately, in that callback. A forward pass has to complete before any rule can ask a
   question, which forces every security rule to defer its work to `Program:exit` and to buffer its
   candidate nodes — more state, worse locality, and reports that come out in traversal-unrelated
   order.
4. **Memoisation is trivial and shared.** `Map<Node, TaintValue|null>` on the analysis object; fifty
   rules asking about overlapping subexpressions each pay once. A forward pass's state is
   per-program-point, so sharing it across rules means keeping the whole lattice alive.
5. **Flow sensitivity buys little in this domain.** The value of a forward pass is that it can kill
   taint at a reassignment and join differently per branch. Injection bugs are overwhelmingly
   straight-line: read input, concatenate, execute. Paying for a CFG, a lattice, a join operator and
   a loop fixpoint to catch the rare branch-dependent case, in a per-file linter, is the definition
   of a bad trade.

What we give up, stated plainly:

- **No kill on reassignment.** `let x = req.query.id; x = 'safe'; sink(x)` is a false positive.
  Mitigated by the multi-write penalty (§7) and, in practice, rare — but real. It is the price of
  item 5 and it is the one to revisit first if the FP data says so.
- **No branch awareness.** `sink(cond ? tainted : safe)` reports; correct, but so does
  `if (!isSafe) return; sink(x)`, which is a false positive if `isSafe` is a real validation. Handled
  by registering validators as sanitizers (§6), not by control-flow analysis.
- **No ordering guarantee.** Backward resolution cannot tell `x = tainted; sink(x)` from
  `sink(x); x = tainted`. The second is not a real bug. Cheap partial fix: compare `range[0]` and
  ignore writes that occur after the sink, *within the same function* — one comparison, no CFG.
  Wrong inside loops, so it is a `ponytail:` comment, not a claim.

If the false-positive data later shows reassignment-kill is the dominant complaint, the upgrade is a
local, per-function, straight-line reaching-definitions pass over statements in one block — not a
whole abstract interpreter. Bounded escalation.

## 3. Phase 1: same-function propagation

`taintOf(node)` is a memoised recursive dispatch. Skeleton, then the cases:

```js
function taintOf(node) {
  if (!node) return null
  if (taintCache.has(node)) { stats.cacheHits++; return taintCache.get(node) }
  if (inProgress.has(node)) return null              // cycle: see §5
  if (path.length > options.maxHops) { stats.bailouts.maxHops++; return null }

  inProgress.add(node)
  const result = resolve(node)
  inProgress.delete(node)

  taintCache.set(node, result)
  stats.resolved++
  return result
}

function resolve(node) {
  // Cheapest, highest-precision rejection first: a constant cannot be tainted.
  // Verified: getStaticValue folds through variables ('ls ' + 'x' -> 'ls x') and returns
  // null for anything touching req.
  if (getStaticValue(node, scopeOf(node))) return null

  switch (unwrap(node).type) { /* ... */ }
}

/** Strip nodes that never change the value. */
function unwrap(node) {
  switch (node.type) {
    case 'ChainExpression':          return unwrap(node.expression)     // a?.b?.c
    case 'TSAsExpression':                                              // x as string
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':                                         // x!
    case 'TSInstantiationExpression':
      return unwrap(node.expression)
    case 'AwaitExpression':          return unwrap(node.argument)       // await x
    case 'SequenceExpression':       return unwrap(node.expressions.at(-1))
    default: return node
  }
}
```

`unwrap` before dispatch, not inside every case. The TS nodes are there because a plugin that breaks
on `x as string` is useless on the codebases we care about, and handling them costs four lines and no
type information.

### 3.1 Identifier — variable init and reassignment

```js
function resolveIdentifier(node) {
  const reference = referenceFor(node)
  const variable = reference?.resolved
  if (!variable) return resolveUnresolved(node)      // global or cross-file: §3.10

  const source = registry.matchSourceRoot(variable)  // e.g. the `req` parameter itself
  if (source && source.path.length === 0) return startTaint(source, node)

  const definition = variable.defs[0]
  if (definition?.type === 'Parameter') return resolveParameter(variable, definition, node)  // §4
  if (definition?.type === 'ImportBinding') return resolveImport(variable, node)             // §3.10

  const writes = variable.references.filter(r => r.isWrite() && r.writeExpr)
  if (!writes.length) return null

  return combineWrites(writes, node, variable)
}

function combineWrites(writes, node, variable) {
  // No flow sensitivity: if ANY write is tainted, the variable is tainted.
  const tainted = writes
    .map(reference => taintFromWrite(reference))
    .filter(Boolean)

  if (!tainted.length) return null

  // Worst case wins: the write with the least sanitisation and the highest confidence.
  const worst = tainted.reduce(pickWorse)
  const multiWrite = writes.length > 1 ? PENALTY.multiWrite : 0

  return hop(worst, { node, kind: 'read', label: variable.name, penalty: multiWrite })
}

function taintFromWrite(reference) {
  const written = taintOf(reference.writeExpr)

  // Verified: for `q += rhs` writeExpr is the RHS only. The resulting value is
  // previous ⊕ rhs, so a tainted previous value survives the compound assignment.
  if (reference.isReadWrite()) {
    const previous = previousWriteTaint(reference)
    return pickWorse(written, previous) ?? written ?? previous
  }

  return written
}
```

`reference.init` distinguishes the declaration write from later assignments but does not change the
logic — a `const` with one init simply has `writes.length === 1` and therefore no multi-write
penalty, which is where the common, high-confidence case gets its precision.

`previousWriteTaint` looks at writes to the same variable with `range[0] < reference.range[0]`. Not
loop-correct (`q += x` inside a loop where `x` becomes tainted on iteration 2), and marked as such in
the code. The failure direction is a missed finding, not a false one.

### 3.2 Destructuring, including nested / renamed / defaulted

Entirely handled by `resolvePatternPath` (architecture doc §2.4) plus one lookup. No special cases
for nesting, renaming, or defaults — they fall out of the parent walk, verified against all three.

```js
function resolveDestructuredBinding(variable, definition) {
  const { root, path, paramIndex } = resolvePatternPath(definition.name)
  if (!root) { stats.bailouts.pattern++; return null }

  if (paramIndex !== undefined) return resolveParameterPath(root, paramIndex, path)  // §4

  const rootTaint = taintOf(root)
  if (!rootTaint) {
    // The root itself is not tainted, but root+path might name a source:
    // `const { query } = req` where the source is `req.query`.
    const source = registry.matchSourcePath(root, path)
    return source ? startTaint(source, definition.name) : null
  }

  if (path.some(isNonPropagatingProperty)) return null   // `const { length } = tainted`

  return hop(rootTaint, {
    node: definition.name,
    kind: 'destructure',
    label: path.join('.'),
    penalty: PENALTY.destructure,          // 0 — destructuring is exact
  })
}
```

`'...'` in the path (rest element) propagates taint: `const { id, ...rest } = req.query` leaves
`rest` tainted, correctly.

### 3.3 MemberExpression

```js
function resolveMember(node) {
  const source = registry.matchSourceMember(node)      // req.query, location.search, process.env
  if (source) return startTaint(source, node)

  const name = getPropertyName(node, scopeOf(node))     // folds `q[k]` where k = 'id'. Verified.

  // Reading .length / .size of a tainted string is a number. Not injectable.
  if (name && registry.nonPropagatingProperties.includes(name)) return null

  const objectTaint = taintOf(node.object)
  if (!objectTaint) return null

  // A property of a tainted object is tainted. Correct for the injection domain:
  // if req.query is untrusted, so is req.query.id, and so is req.query[anything].
  return hop(objectTaint, {
    node,
    kind: 'member',
    label: name ?? '[computed]',
    penalty: name ? PENALTY.member : PENALTY.computedMember,
  })
}
```

The computed-member penalty exists because `tainted[i]` where `i` is a number may be indexing into
something we have mismodelled. Small penalty, not a rejection.

Optional chaining needs nothing here: `a?.b` is a `MemberExpression` with `optional: true` wrapped in
a `ChainExpression`, and `unwrap` handles the wrapper.

### 3.4 TemplateLiteral

```js
function resolveTemplate(node) {
  const tainted = node.expressions.map(taintOf).filter(Boolean)
  if (!tainted.length) return null

  return hop(tainted.reduce(pickWorse), {
    node, kind: 'template', label: null, penalty: PENALTY.template,
  })
}
```

`pickWorse` is the whole subtlety and it is worth being explicit: for a string built from several
tainted parts, the *string* is only as safe as its **least** sanitised part. One unescaped
interpolation ruins the query.

```js
function pickWorse(a, b) {
  if (!a) return b
  if (!b) return a
  // Fewer cleared kinds = worse. '*' counts as maximally clean.
  const clean = value => value.sanitizedFor.has('*') ? Infinity : value.sanitizedFor.size
  if (clean(a) !== clean(b)) return clean(a) < clean(b) ? a : b
  // Equally sanitised: keep the one we are most confident about, so the report is strongest.
  return a.confidence >= b.confidence ? a : b
}
```

Tagged templates (`sql`tagged``) are **not** this case: a tagged template is a `TaggedTemplateExpression`
and the tag is very often a parameterising helper (`sql`, `prisma.$queryRaw`). Tags are registry
entries — most are sanitizers for their `sql` kind. Untagged interpolation into a raw-query sink is
the actual bug we are looking for, and this distinction is most of the value of a SQL rule.

### 3.5 String concatenation and `+=`

```js
function resolveBinary(node) {
  if (node.operator !== '+') return null      // arithmetic yields numbers; comparison yields booleans

  const tainted = [taintOf(node.left), taintOf(node.right)].filter(Boolean)
  if (!tainted.length) return null

  return hop(tainted.reduce(pickWorse), {
    node, kind: 'concat', label: null, penalty: PENALTY.concat,
  })
}
```

Only `+`. `a - b`, `a * b`, `a & b` cannot produce an injectable string, which is a free precision
win requiring no types.

`+=` is not handled here — it is an `AssignmentExpression` and reaches us through
`Reference.writeExpr` in §3.1, where `isReadWrite()` reconstructs `previous ⊕ rhs`. This is the trap
verified in architecture doc §2.3 and it deserves a dedicated fixture test.

### 3.6 `String.concat` and `Array.join`

Name-based, because we have no types in phase 1.

```js
// registry.js
propagators: [
  { method: 'concat', receiver: true,  args: 'all',  penalty: 'methodName' },
  { method: 'join',   receiver: true,  args: 'none', penalty: 'methodName' },
  { method: 'replace', receiver: true, args: [1],    penalty: 'methodName' },  // replacement can be tainted
  { method: 'toString', receiver: true, args: 'none', penalty: 'methodName' },
  { method: 'trim',   receiver: true,  args: 'none', penalty: 'methodName' },
  { method: 'slice',  receiver: true,  args: 'none', penalty: 'methodName' },
  { method: 'padStart', receiver: true, args: 'all', penalty: 'methodName' },
]
```

```js
function resolvePropagatorCall(node, propagator) {
  const candidates = []
  if (propagator.receiver) candidates.push(taintOf(node.callee.object))
  if (propagator.args === 'all') candidates.push(...node.arguments.map(taintOf))
  else if (Array.isArray(propagator.args)) for (const i of propagator.args) candidates.push(taintOf(node.arguments[i]))

  const tainted = candidates.filter(Boolean)
  if (!tainted.length) return null

  return hop(tainted.reduce(pickWorse), {
    node, kind: 'call', label: propagator.method, penalty: PENALTY.methodName,
  })
}
```

A table, not a `switch`, so adding `normalize` or `repeat` is a one-line data change. The
`methodName` penalty prices the assumption that `x.join(',')` is `Array.prototype.join` and not some
user-defined `join`. Type information, when enabled, is the natural place to zero this penalty — the
one concrete precision upgrade types buy us in phase 1's model.

`Array.join` is where container taint leaks in without container analysis: `[a, b].join()` is tainted
if `a` is, because the elements are right there. `arr.join()` where `arr` was built by `push` is not
(§5).

### 3.7 Ternary and logical operators

```js
function resolveConditional(node) {
  const tainted = [taintOf(node.consequent), taintOf(node.alternate)].filter(Boolean)
  if (!tainted.length) return null
  return hop(tainted.reduce(pickWorse), { node, kind: 'ternary', label: null, penalty: PENALTY.ternary })
}

function resolveLogical(node) {
  // `a || b`, `a ?? b`: the value is a or b.
  // `a && b`: the value is a (falsy) or b. `a` reaching a string sink as falsy is not exploitable,
  // so only `b` matters.
  const branches = node.operator === '&&' ? [node.right] : [node.left, node.right]
  const tainted = branches.map(taintOf).filter(Boolean)
  if (!tainted.length) return null
  return hop(tainted.reduce(pickWorse), { node, kind: 'logical', label: node.operator, penalty: PENALTY.logical })
}
```

`req.query.id ?? 'default'` stays tainted, correctly — the default is only the fallback. The penalty
records that one branch may be safe.

The `&&` asymmetry is a small, free precision win: `flag && tainted` is exactly as dangerous as
`tainted`, but `tainted && safe` is not dangerous at all.

### 3.8 Sanitizer calls

```js
function resolveSanitizerCall(node, sanitizer) {
  const argument = node.arguments[sanitizer.argument]
  const taint = taintOf(argument)
  if (!taint) return null

  return {
    ...taint,
    sanitizedFor: new Set([...taint.sanitizedFor, ...sanitizer.clears]),
    confidence: Math.min(taint.confidence, sanitizer.confidence ?? 1),
    path: [...taint.path, { node, kind: 'sanitize', label: sanitizer.id, penalty: 0 }],
  }
}
```

A sanitizer does not *remove* taint — it adds to `sanitizedFor` and stays on the path. Two reasons
this matters: the value is still untrusted for every *other* kind (§6), and the flow path can then
say "escaped for SQL, then interpolated into HTML", which is the message that makes the finding
believable.

### 3.9 Unknown calls

```js
function resolveUnknownCall(node) {
  if (options.callDepth > 0) return resolveLocalCall(node)   // §4
  stats.bailouts.unknownCall++
  return null
}
```

An unknown function call **breaks the chain**. `sink(transform(tainted))` does not report, because
`transform` might be a sanitizer we do not know about, and reporting through arbitrary unknown
functions is the single largest source of false positives in every SAST tool that does it.

The `PENALTY.unknownCall` entry in the table (§7) exists for the *inverse* case only: when a
phase-2 local call resolves but its body is only partially understood.

### 3.10 Imports and unresolved identifiers

```js
function resolveImport(variable, node) {
  const entry = tracked.get(variable)              // ReferenceTracker result
  if (entry?.category === 'source') return startTaint(entry.source, node)
  stats.bailouts.unknownImport++
  return null                                       // architecture doc §4
}

function resolveUnresolved(node) {
  // reference.resolved === null: a global, or a typo. Globals can be sources (`location`).
  const source = registry.matchSourceGlobal(node)
  return source ? startTaint(source, node) : null
}
```

`Reference.resolved === null` is the cross-file boundary marker, and this is where the honest
fallback from architecture doc §4 is implemented — in four lines, because there is nothing more to
do.

## 4. Phase 2: interprocedural, within one file

Two directions, same file only, off by default (`callDepth: 0`), enabled with `callDepth: 1` or `2`.

### 4.1 Return -> caller

```js
function resolveLocalCall(node) {
  const target = localFunctionFor(node.callee)      // findVariable -> FunctionName/Variable def
  if (!target) return resolveUnknownCall(node)

  const key = `return:${target.range[0]}`
  if (inProgress.has(key)) return null              // recursion
  if (options.callDepth <= depth) { stats.bailouts.maxCallDepth++; return null }

  inProgress.add(key)
  depth++
  const returned = returnExpressions(target).map(taintOf).filter(Boolean)
  depth--
  inProgress.delete(key)

  if (!returned.length) return null

  return hop(returned.reduce(pickWorse), {
    node, kind: 'return', label: nameOf(target), penalty: PENALTY.return,
  })
}
```

`returnExpressions` collects `ReturnStatement.argument` nodes belonging to `target` — bounded walk of
the function body, skipping nested functions — plus the concise arrow body. This is the one place we
walk AST rather than scopes, and it is bounded by one function body, computed once per target, and
memoised.

### 4.2 Argument -> parameter

```js
function resolveParameterPath(functionNode, paramIndex, path) {
  const callSites = callSitesOf(functionNode)
  if (!callSites) { stats.bailouts.unknownCallers++; return null }

  const key = `param:${functionNode.range[0]}:${paramIndex}`
  if (inProgress.has(key)) return null
  if (options.callDepth <= depth) { stats.bailouts.maxCallDepth++; return null }

  inProgress.add(key)
  depth++
  const incoming = callSites
    .map(call => taintOf(call.arguments[paramIndex]))
    .filter(Boolean)
  depth--
  inProgress.delete(key)

  if (!incoming.length) return null

  const base = incoming.reduce(pickWorse)
  const narrowed = path.length ? narrowByPath(base, path) : base
  return hop(narrowed, {
    node: functionNode.params[paramIndex],
    kind: 'param',
    label: `${nameOf(functionNode)}(#${paramIndex})`,
    penalty: PENALTY.param + (callSites.length > 1 ? PENALTY.multiCallSite : 0),
  })
}

/**
 * Enumerate call sites, or return null if we cannot be sure we have them all.
 * Null is the important case: an exported function has callers we cannot see.
 */
function callSitesOf(functionNode) {
  const variable = variableForFunction(functionNode)
  if (!variable) return null                          // anonymous, or an inline callback

  const calls = []
  for (const reference of variable.references) {
    if (!reference.isRead()) continue
    const { parent } = reference.identifier
    // Used as a value, not called: passed as a callback, stored, exported, re-exported.
    // We cannot enumerate its callers, so we know nothing about its parameters.
    if (parent?.type !== 'CallExpression' || parent.callee !== reference.identifier) return null
    calls.push(parent)
  }

  if (isExported(functionNode)) return null
  return calls.length ? calls : null
}
```

`callSitesOf` returning `null` on *any* non-call reference is the conservative choice, and it is the
right one: a function passed as a callback (`app.get('/x', handler)`) is called by code we cannot
see. Note the asymmetry with §1.1 — a framework *entry point* is handled by the `export`-form
TaintSource, which says "the caller is the framework and its argument is untrusted". That is
knowledge, encoded as data. Guessing it from the AST is not.

### 4.3 Termination

Three independent guards, all necessary:

| Guard | Stops | Default |
| --- | --- | --- |
| `inProgress` Set of node/`return:`/`param:` keys | cycles: direct and mutual recursion, `f` calling `g` calling `f` | always on |
| `depth` counter vs `options.callDepth` | fan-out blow-up — one call into a function called from 40 sites, each argument itself a call | 0 (phase 2 off) / 1 / 2 |
| `path.length` vs `options.maxHops` | long chains that would be below `minConfidence` anyway | 12 |

Re-entry on a cycle returns `null` (untainted), not "unknown-tainted". Recursive string building
through a tainted parameter is a real pattern, so this is a real false negative — accepted, because
the alternative is fixpoint iteration.

`maxHops` and `minConfidence` interact usefully: with the penalty table in §7, a 12-hop path is
already below any sane threshold, so `maxHops` mostly saves work rather than changing results. If
they ever *disagree* — a 12-hop path still above threshold — the penalty table is too generous and
that is the thing to fix.

## 5. Aliasing

### Tractable

| Pattern | Why it works |
| --- | --- |
| `const q = req.query` | single-def `const`, one write reference, `writeExpr` is the source. Zero penalty. |
| `let q = req.query` (never reassigned) | one write, no multi-write penalty. Same thing. |
| `const { query } = req` | `resolvePatternPath` (§3.2). Exact. |
| `const q = req.query; const id = q.id` | chained: `resolveMember` -> `resolveIdentifier` -> `writeExpr`. Two hops, `member` penalties only. |
| Function parameter alias, same file | §4.2, at `param` penalty. |
| `const f = escape; f(x)` | `findVariable` resolves `f` to the import; `ReferenceTracker` already handles the aliasing. |

The common real-world alias shapes are all def-use chains, which is exactly what ESLint hands us.
This is why the design works at all without a points-to analysis.

### Not tractable — and no attempt is made

| Pattern | What it would need |
| --- | --- |
| `o.x = tainted; sink(o.x)` | points-to analysis, heap model |
| `arr.push(tainted); sink(arr[0])` | container element taint + loop fixpoint |
| `Object.assign(o, req.query); sink(o.id)` | interprocedural heap effects |
| `mutate(o); sink(o.x)` | callee side-effect summaries |
| `const a = o; a.x = tainted; sink(o.x)` | full alias analysis |
| `map.set(k, tainted); sink(map.get(k))` | container + key modelling |
| `this.query = tainted; sink(this.query)` | instance state, cross-method |
| `globalThis.x = tainted` | whole-program |

Every one of these returns `null` — no report. Two reasons this is the correct call rather than
laziness dressed up:

1. Approximating them means "any property of any object that was ever near a tainted value is
   tainted", which produces findings on half of every real file.
2. They mostly are not how injection bugs are written. Injection is `read input -> build string ->
   execute`, usually inside one function, usually in under ten lines. The tractable list above covers
   that shape completely.

Concrete missed-bug example, for honesty: `const params = {}; params.id = req.query.id;
db.query('... ' + params.id)` is not detected. That belongs in every rule's readme limitations
section.

## 6. Typed sanitization

**A SQL escaper does not sanitize for HTML.** The model has to make that structurally
inexpressible-as-a-mistake, not merely documented.

### The wrong model

The obvious design is `TaintValue.kinds: ['sql', 'html']` — "this value is SQL-tainted and
HTML-tainted" — and a sanitizer removes kinds. It is wrong, and it is wrong in a way that produces
false negatives, the invisible kind:

- A value's taint is not typed. `req.query.id` is just untrusted. It becomes a SQL problem when it
  reaches a query and an HTML problem when it reaches `innerHTML`. **The context is typed, not the
  value.**
- With `kinds` on the value, a source entry has to enumerate every kind it could ever be dangerous
  for. Miss `ldap` on one source and every LDAP sink silently stops firing for it.
- Adding a new sink kind would mean editing every source. Fifty rules, and the data grows as the
  product of sources and sinks.

### The model

| Concept | Field | Meaning |
| --- | --- | --- |
| Source | *(no kind)* | untrusted, period |
| Sink | `requires: 'sql'` | needs sanitisation of kind `sql` |
| Sanitizer | `clears: ['sql']` | provides sanitisation of kind `sql` |
| TaintValue | `sanitizedFor: Set` | which kinds have been provided on this path |

The check is one line, and it is the same line in all fifty rules:

```js
function isUnsafeFor(taint, kind) {
  return !taint.sanitizedFor.has(kind) && !taint.sanitizedFor.has('*')
}
```

The desired property falls out with nothing to get wrong:

```js
// mysql.escape clears ['sql']
const escaped = mysql.escape(req.query.name)
db.query('SELECT * FROM u WHERE n = ' + escaped)   // safe: sanitizedFor has 'sql'
el.innerHTML = '<b>' + escaped + '</b>'            // REPORTED: sanitizedFor lacks 'html'
```

No rule had to know that `mysql.escape` is not an HTML escaper. The registry said what it clears; the
sink said what it requires; the set membership did the rest. Data grows as sources + sinks, not
sources x sinks.

### The kind vocabulary

Closed, small, documented in `registry.js`, each tied to a CWE so it is not invented:

| Kind | Sinks | CWE |
| --- | --- | --- |
| `sql` | raw query builders, `$queryRaw` | CWE-89 |
| `html` | `innerHTML`, `dangerouslySetInnerHTML`, `document.write` | CWE-79 |
| `shell` | `child_process.exec`, `execSync` | CWE-78 |
| `path` | `fs.*`, `path.join` into fs | CWE-22 |
| `url` | `location`, `window.open`, `fetch` | CWE-601 |
| `regex` | `new RegExp` | CWE-1333 |
| `code` | `eval`, `new Function` | CWE-95 |
| `ldap` / `nosql` / `xpath` / `header` / `log` / `template` | as they get rules | CWE-90 / 943 / 643 / 113 / 117 / 1336 |
| `*` | matched by every sink | — |

`'*'` is for genuine type-changing operations only: `Number(x)`, `parseInt(x)`, `x.length`, a Zod
`.uuid().parse()`. Anything that provably cannot be an injectable string any more. It is the only
wildcard, it is rare, and every `'*'` entry needs a note explaining why it holds. Adding `'*'` to a
string-to-string function is the mistake that silently disables the plugin, so it warrants a review
checklist item and a `registry` test that asserts the `'*'` list is short and annotated.

Kinds are checked against the closed vocabulary at registry load; a typo in a consumer's custom entry
(`requires: 'sqli'`) throws at startup rather than silently never matching.

## 7. Confidence degradation

This is the false-positive control mechanism. It is a number, it is auditable per hop, and it is
regression-tested.

### The table

```js
// machinery/security/taint.js
const PENALTY = {
  // exact: the analysis knows precisely what happened
  init:            0,      // const x = tainted
  destructure:     0,      // const { a } = tainted   (verified exact, §3.2)
  read:            0,      // reading a single-write variable
  sanitize:        0,      // handled by confidence cap, not penalty

  // near-exact: a small modelling assumption
  member:          0.02,   // tainted.foo
  computedMember:  0.05,   // tainted[i]
  template:        0.05,   // `${tainted}`
  concat:          0.05,   // 'x' + tainted
  methodName:      0.05,   // assumed Array.prototype.join and not a user-defined join

  // branch: one path may be safe
  ternary:         0.08,
  logical:         0.08,

  // flow-insensitivity: we may be reading the wrong write
  multiWrite:      0.15,   // the variable is assigned more than once

  // interprocedural
  param:           0.10,
  return:          0.10,
  multiCallSite:   0.10,   // several callers, argument taint differs between them

  // partial understanding
  unknownCall:     0.35,   // a resolved local call whose body we only partly modelled
}
```

Confidence is `source.confidence - Σ penalties`, floored at 0, capped by any sanitizer's
`confidence`.

**Additive, not multiplicative** — decided. Multiplicative decay (`c *= 0.95`) punishes long
legitimate chains too hard: eight exact-ish hops of a real bug lands at 0.66 and gets dropped, even
though every hop was precise. Additive penalties mean *exact* hops cost literally nothing, so a
twenty-hop chain of `const` aliases stays at full confidence — which is correct, because we are
certain about every step. The cost only accrues where we actually guessed. Additive is also
trivially explainable in an error message, and "why did this get 0.62" is a question that gets asked.

### How the three degradation causes are handled

| Cause | Mechanism |
| --- | --- |
| **Hop count** | Emergent, not explicit. Long chains accumulate penalties *if the hops were inexact*. There is deliberately no per-hop distance penalty: hop count is a proxy for uncertainty, and we have the real thing. `maxHops` remains as a work bound. |
| **Unknown propagation** | Return `null` (§3.9). An unknown function is not a low-confidence propagator, it is a wall. This is the single most important false-positive decision in the design. |
| **Unresolvable values** | `getStaticValue` non-null -> untainted (verified). `resolvePatternPath` returning no root -> `null` + `stats.bailouts.pattern`. Unresolved reference not matching a global source -> `null`. Unresolvable never means "assume the worst". |

### Buckets and thresholds

```js
function confidenceBucket(confidence) {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'medium'
  return 'low'
}
```

Default `minConfidence: 0.5` — `low` findings are computed and available in `stats` but not reported.
Raising it to 0.8 gives a high-signal mode for CI on a legacy codebase; lowering it to 0.3 is an
audit mode. One number in settings, and it is the knob a team will actually reach for.

Combined with severity, per AGENTS.md:

| | confidence high | medium | low |
| --- | --- | --- | --- |
| **severity high** | report (rule default `error`) | report (rule default `warn`) | drop |
| **severity medium** | report (`warn`) | report (`warn`) | drop |
| **severity low / smell** | report (`warn`) | drop | drop |

The bucket goes into the message so a developer can calibrate their own trust:
`"...(confidence: medium — value passes through a ternary and a reassigned variable)"`. The
explanation is generated from the highest-penalty hops on the path, not written per rule.

### Keeping the numbers honest

The penalty table is a set of magic numbers and will drift unless it is pinned. Every fixture in the
correctness corpus asserts an **exact expected confidence**, not just report/no-report. Changing
`PENALTY.template` from 0.05 to 0.08 then shows up as a diff across every affected fixture, and
whoever changes it has to look at each one. That is the only mechanism that stops the table becoming
folklore.

Initial values are engineering judgement, not measurement. They get tuned once we have real
false-positive data from real codebases, and until then the readmes say so.

## 8. Known limitations

Stated for the readmes, verbatim where useful. Static analysis does not prove the absence of a
vulnerability.

**Structural — will not change**

1. Source and sink must be in the same file, unless the boundary is registry data
   (architecture doc §4). Cross-module flows are missed.
2. No taint through object properties, arrays, `Map`/`Set`, or class instance state (§5).
   `params.id = req.query.id` breaks the chain.
3. No taint through unknown function calls (§3.9). A local helper that concatenates is invisible in
   phase 1, and in phase 2 only within `callDepth`.
4. No loop reasoning. Accumulation across iterations is missed.
5. Recursion is treated as untainted (§4.3).

**Flow-insensitivity — false positives, priced**

6. Reassignment does not kill taint: `let x = req.query.id; x = 'safe'; sink(x)` reports at reduced
   confidence.
7. Guard clauses are not understood: `if (!isValid(x)) return; sink(x)` reports unless `isValid` is a
   registered sanitizer.
8. Both ternary branches are considered live.

**Heuristic — false positives and negatives**

9. Request-object sources are matched by parameter name and arity. `function handler(req)` where
   `req` is not a request object is a false positive, capped at 0.75 confidence and configurable
   away.
10. Propagator methods are matched by name without types. A user-defined `join` is assumed to be
    `Array.prototype.join`. Type information, when enabled, removes this.
11. Sanitizer *coverage* is the practical ceiling on precision. An unregistered escaper means false
    positives; conversely, a wrongly-registered one — especially with `clears: ['*']` — silently
    disables detection. Registry review is a security-review step, not a housekeeping one.

**Deliberate design limits**

12. Interprocedural analysis is off by default and bounded to `callDepth` 1-2.
13. `maxHops` 12 caps chain length.
14. Confidence penalties are initial engineering judgement, not measured.
15. Phase 1 uses no type information at all; results are identical with and without a TS program.
16. No autofix, ever, on a security finding. Suggestions only where the transformation is mechanical
    (AGENTS.md).

## 9. Phasing

| Phase | Content | Exit criterion |
| --- | --- | --- |
| 1 | `taintOf` §3, registry for one framework + one sink family (SQL), `finding.report`, cache, fixture corpus with confidence assertions | one rule shipped end to end; measured cost within the §7.2 budget |
| 2 | Interprocedural §4 behind `callDepth`, remaining sink kinds, sanitizer registry breadth | false-positive rate measured on the medium corpus |
| 3 | Optional type information (`methodName` and `member` penalty removal, string-ness narrowing), Promise/`.then` propagation | a named false positive that only types can remove |

Phase 1 is roughly 400 lines of `taint.js`, 200 of `registry.js`, 80 of `finding.js`. If it comes out
materially larger than that, something in here did not earn its place.
