const fs = require('fs')
const path = require('path')
const { Linter } = require('eslint')
const { getStaticValue, getPropertyName, findVariable } = require('@eslint-community/eslint-utils')
const { isFunctionNode } = require('../ast')
const registry = require('./registry')

/**
 * Confidence penalties, additive.
 *
 * Additive rather than multiplicative so that *exact* hops cost literally
 * nothing: a chain of `const` aliases keeps full confidence, which is correct,
 * because we are certain about every step. Multiplicative decay would drop a
 * real eight-hop bug below threshold purely for being long.
 *
 * The bound on that is `maxHops` (default 12), not the confidence: a chain
 * longer than that is dropped outright regardless of how exact every hop was.
 * So "any number of exact hops is free" is true only up to the hop limit, and
 * the limit is a work bound doing double duty as a correctness cliff.
 *
 * These numbers are engineering judgement, not measurement. Every fixture in
 * the test corpus asserts an exact expected confidence, so changing one shows
 * up as a diff across every affected case and someone has to look at each.
 */
const PENALTY = {
  // exact — the analysis knows precisely what happened
  read: 0,
  destructure: 0,
  sanitize: 0,

  // near-exact — a small modelling assumption
  member: 0.02,
  computedMember: 0.05,
  template: 0.05,
  concat: 0.05,
  methodName: 0.05,

  // branch — one path may be safe
  ternary: 0.08,
  logical: 0.08,

  // flow-insensitivity — we may be reading a write that a later one replaced.
  // Structurally the same uncertainty as a branch (one of several possible
  // values reaches the sink), so priced the same. It was 0.15, which silently
  // dropped the most common way to build a dynamic query in Node:
  // `let where = '1=1'; if (req.query.name) where = '... ' + req.query.name`.
  // That is a complete auth bypass, and stacking 0.15 on two ordinary
  // string-building hops put it under the reporting floor with no output at all.
  multiWrite: 0.08,
}

const cache = new WeakMap()

// --- Cross-file resolution (interprocedural-lite, Phase 1) ------------------
//
// Process-lifetime, keyed by absolute path — deliberately not the sourceCode
// WeakMap above, because there is no sourceCode for a file nobody asked to
// lint. A single `npm run lint` invocation is a fresh process, so this never
// needs to see an edit; a persistent daemon (watch mode, an editor extension)
// would need real invalidation, which this does not have.
// ponytail: process-lifetime cache, unbounded. Add an eviction policy if a
// daemon use case ever makes that observably wrong.
const crossFileSourceCache = new Map()
const sourceRootCache = new Map()
const crossFileInProgress = new Set()
const crossFileLinter = new Linter()

module.exports = { analyze, PENALTY }

/**
 * The per-file analysis. Cached on the SourceCode, so calling this from fifty
 * rules costs one construction.
 *
 * Invalidation is structural: ESLint builds a new SourceCode for every parse,
 * so every edit and every --fix pass is a natural cache miss. There is
 * deliberately no TTL, no size cap and no invalidate() — anything writable
 * there would be a bug writable there.
 *
 * `filename` is not part of the cache key — a SourceCode already corresponds
 * to exactly one file's content — but is needed to resolve *this file's*
 * relative and root-slash imports when a rule reaches a cross-file call.
 */
function analyze(sourceCode, options, filename) {
  const cached = cache.get(sourceCode)
  if (cached) {
    cached.stats.cacheHits++
    return cached
  }

  const analysis = createAnalysis(sourceCode, options, filename)
  cache.set(sourceCode, analysis)
  return analysis
}

function createAnalysis(sourceCode, options, filename) {
  const known = registry.merge(options.registry)
  const stats = { resolved: 0, cacheHits: 0, bailouts: {} }

  const taintCache = new Map()
  const inProgress = new Set()
  // collectReturns's result depends only on the function node — never on a
  // particular call's bindings — so it is safe to compute once per
  // function and reuse for every call site, the same shape of fix
  // reachableSinksOf's memo needed: a widely-shared helper's body was
  // getting re-walked once per call site with no caching at all.
  const returnsCache = new Map()
  // Active helper-summary parameter bindings, or null in normal resolution.
  let bindingScope = null
  const references = indexReferences(sourceCode)
  // Cycle guard for reachableSinksOf's same-file recursion, keyed by
  // function AST node — the cross-file equivalent of crossFileInProgress,
  // but scoped to this analysis instance since node identity only means
  // anything within one file.
  const sinkScanInProgress = new Set()
  // Memo for reachableSinksOf's same-file walk, keyed by function node +
  // a signature of the bound parameter taints (bindingSignature already
  // disambiguates `f(x)` from `f('literal')` — see below — so this is safe
  // to keep for the whole analysis instance, not just one top-level call).
  // Without it, a call graph where two functions each call a shared third
  // one re-walks that shared function once per path to it, exponential in
  // fan-out depth — an ordinary service-layer file with a dozen small
  // functions each calling two others took over twenty seconds to lint
  // even scoped to one top-level call. Scoping it to one call was not
  // enough: a real minified bundle visits the same widely-shared helper
  // from tens of thousands of independent call sites, one top-level
  // `reachableSinksOf` entry each — resetting the memo between them meant
  // every single one re-walked that helper's body from scratch. Persistent
  // per analysis instance instead, the same lifetime `sinkExportMemo`
  // already uses for the cross-file case, and for the same reason: this
  // whole instance is already cached by SourceCode (see `analyze`), so a
  // helper imported and called from many places was never going to need
  // re-walking within one lint pass anyway. The message-path imprecision
  // this trades away — two callers of the same helper with
  // confidence-and-sanitized-kind-identical but differently-sourced taint
  // share the first caller's reported flow path — was already an
  // accepted cost of scoping by signature rather than full taint identity;
  // this only widens how often it can happen, not what kind of cost it is.
  const sinkScanMemo = new Map()
  // Tracks whether reachableSinksOf is already inside a walk, so only the
  // outermost call applies the per-call-site sink dedup below — a separate
  // concern from the memo above, which now outlives any single call.
  let sinkScanDepth = 0
  // sinksReachableInExport's persistent twin: analyze() caches this whole
  // analysis instance by SourceCode, so unlike the same-file memo above,
  // this one is never reset — it lives as long as this file's analysis
  // does, because a module that gets imported and called from several
  // places (or several times from one place) is the cross-file version of
  // the exact same fan-out.
  const sinkExportMemo = new Map()

  return { taintOf, sinkAt, sourceAt, referenceFor, sanitizedAt, stats, summarizeExport, reachableSinksOf, sinksReachableInExport }

  function referenceFor(identifier) {
    return references.get(identifier) ?? null
  }

  /** @returns {TaintValue | null} null means untainted *or* unknown, deliberately indistinguishable. */
  function taintOf(node) {
    if (!node) return null

    // A node inside an active helper summary resolves differently depending
    // on *which call* is being summarized — the same `x.trim()` inside
    // `const clean = x => x.trim()` is tainted for one call site and not
    // for another. Caching by node identity alone, with no regard for which
    // bindingScope was active, made whichever call resolved first win for
    // every later call to the same helper — a real false negative when the
    // untainted call happens to run first. So: no cache read or write while
    // a bindingScope is in effect; resolution is naturally re-run per call.
    const cacheable = !bindingScope

    if (cacheable && taintCache.has(node)) return taintCache.get(node)
    if (inProgress.has(node)) return null

    inProgress.add(node)
    const result = resolve(node)
    inProgress.delete(node)

    if (cacheable) taintCache.set(node, result)
    stats.resolved++
    return result
  }

  function resolve(node) {
    const unwrapped = unwrap(node)

    // Cheapest, highest-precision rejection available: a value we can fold to a
    // constant cannot be tainted. This filters most of the safe cases in one
    // call, including `'a' + 'b'` and template literals with no expressions.
    if (getStaticValue(unwrapped, scopeOf(unwrapped))) return null

    const result = resolveByType(unwrapped)

    // Flow sensitivity, in the shapes this file can prove without a CFG: an
    // allowlist membership guard, or a path-containment guard, over this
    // exact expression. `if (!TABLES.includes(t)) return` and
    // `if (!resolved.startsWith(base)) return` both make every later use
    // of the guarded expression safe.
    if (result && isFlowGuarded(unwrapped)) return null

    return result
  }

  function resolveByType(unwrapped) {
    switch (unwrapped.type) {
      case 'Identifier': return resolveIdentifier(unwrapped)
      case 'MemberExpression': return resolveMember(unwrapped)
      case 'TemplateLiteral': return resolveTemplate(unwrapped)
      case 'BinaryExpression': return resolveBinary(unwrapped)
      case 'ConditionalExpression': return resolveConditional(unwrapped)
      case 'LogicalExpression': return resolveLogical(unwrapped)
      case 'CallExpression': return resolveCall(unwrapped)
      case 'NewExpression': return resolveNew(unwrapped)
      case 'TaggedTemplateExpression': return resolveTaggedTemplate(unwrapped)
      default: return null
    }
  }

  /**
   * Two guard shapes are proven, both requiring textual identity with the
   * guarded expression:
   *
   *   if (TABLES.includes(t)) { ...t... }        // positive, inside consequent
   *   if (!TABLES.includes(t)) return; ...t...   // negative, abrupt consequent
   *
   * checkOf decides what "proven" means for the guard's test expression —
   * allowlist membership against a foldable primitive collection, or
   * path-containment against an unqualified prefix. The else branch of
   * neither shape is proven, guards do not cross function boundaries, and
   * anything but an abrupt negative-consequent keeps nothing: falling
   * through an `if` whose body merely logs would prove nothing.
   */
  function isGuardProven(node, checkOf) {
    let current = node

    while (current.parent) {
      const parent = current.parent

      if (parent.type === 'IfStatement' && parent.consequent === current) {
        if (checkOf(parent.test, node)) return true
      }

      if (parent.type === 'BlockStatement') {
        const index = parent.body.indexOf(current)
        for (let i = index - 1; i >= 0; i--) {
          const statement = parent.body[i]
          if (statement.type !== 'IfStatement' || statement.alternate) continue
          const argument = negateTest(statement.test)
          if (!argument || !checkOf(argument, node)) continue
          if (isAbruptConsequent(statement.consequent)) return true
        }
      }

      // Guards live inside one function; do not climb past its boundary.
      // The boundary check comes after the BlockStatement handling above so
      // that a function's own body block still gets scanned.
      if (isFunctionNode(parent)) break

      current = parent
    }

    return false
  }

  function isFlowGuarded(node) {
    return isGuardProven(node, isMembershipCheckOf) || isGuardProven(node, isContainmentCheckOf)
  }

  function negateTest(test) {
    if (test?.type !== 'UnaryExpression' || test.operator !== '!') return null
    return test.argument
  }

  function isAbruptConsequent(statement) {
    if (statement.type === 'BlockStatement')
      return statement.body.every(s => s.type === 'ReturnStatement' || s.type === 'ThrowStatement')
    return statement.type === 'ReturnStatement' || statement.type === 'ThrowStatement'
  }

  // --- sources -------------------------------------------------------------

  function sourceAt(node) {
    if (node.type === 'Identifier') return sourceForIdentifier(node)
    if (node.type === 'MemberExpression') return sourceForMember(node)
    return null
  }

  function sourceForIdentifier(node) {
    const global = known.sources.find(source => !source.path.length && isGlobalNamed(node, source.root.global))
    if (global) return global

    const variable = referenceFor(node)?.resolved
    const parameter = variable?.defs.find(definition => definition.type === 'Parameter')
    if (!parameter) return null

    return known.sources.find(source => !source.path.length && matchesParameter(source, variable, parameter)) ?? null
  }

  /**
   * Is this identifier a reference to the *global* of that name?
   *
   * Not the same question as "does it fail to resolve". A config that declares
   * `globals.browser` gives `location` a real Variable in the global scope with
   * no definitions, so testing for an unresolved reference finds nothing — and
   * silently finding nothing looks exactly like being secure. A shadowing
   * `const location = ...` has a definition, and correctly does not match.
   */
  function isGlobalNamed(identifier, name) {
    if (!name || identifier.type !== 'Identifier' || identifier.name !== name) return false

    const variable = referenceFor(identifier)?.resolved
    if (!variable) return true

    return !variable.defs.length && variable.scope.type === 'global'
  }

  /** Same shadowing check as isGlobalNamed, but for the regex-matched constructors. */
  function isGlobalConstructorNamed(identifier, pattern) {
    if (!pattern || identifier.type !== 'Identifier' || !pattern.test(identifier.name)) return false

    const variable = referenceFor(identifier)?.resolved
    if (!variable) return true

    return !variable.defs.length && variable.scope.type === 'global'
  }

  function sourceForMember(node) {
    const { root, path } = memberChain(node)
    if (!root || !path.length) return null

    return known.sources.find(source =>
      source.path.length &&
      isPrefix(source.path, path) &&
      matchesRoot(source, root)
    ) ?? null
  }

  /**
   * A source path matches any deeper access beneath it: `req.query` being
   * untrusted makes `req.query.filter.name` untrusted too. Requiring an exact
   * length match broke `const { query: { id } } = req` — the destructured form
   * of the same access — and would have made path-qualified sources a false
   * negative rather than a narrowing.
   */
  function isPrefix(prefix, path) {
    return prefix.length <= path.length && prefix.every((segment, i) => segment === path[i])
  }

  function matchesRoot(source, root) {
    if (root.type !== 'Identifier') return false
    if (isGlobalNamed(root, source.root.global)) return true

    const variable = referenceFor(root)?.resolved
    const parameter = variable?.defs.find(definition => definition.type === 'Parameter')
    return Boolean(parameter && matchesParameter(source, variable, parameter))
  }

  /**
   * The parameter-name heuristic, and the shape constraints that keep it from
   * flagging every `function f(req)` where `req` is a Redis client.
   */
  function matchesParameter(source, variable, definition) {
    const rule = source.root.param
    if (!rule) return false
    if (!rule.name.test(variable.name)) return false
    if (!isFunctionNode(definition.node)) return false

    // `index` and `arity` are optional and unused by the shipped request
    // sources. Gating on the handler signature was simultaneously too strict
    // and too loose: it missed every Express error handler — `(err, req, res,
    // next)`, arity 4 with `req` at index 1 — while still matching unrelated
    // two-argument callbacks. Path qualification discriminates better.
    if (rule.index !== undefined && definition.node.params[rule.index] !== definition.name) return false

    const [min, max] = rule.arity ?? []
    if (min !== undefined && (definition.node.params.length < min || definition.node.params.length > max)) return false

    return true
  }

  function startTaint(source, node) {
    return {
      source,
      sanitizedFor: new Set(),
      confidence: source.confidence,
      path: [{ node, kind: 'source', label: shortText(node), penalty: 0 }],
    }
  }

  // --- sinks ---------------------------------------------------------------

  function sinkAt(node) {
    if (node.type !== 'CallExpression' && node.type !== 'MemberExpression') return null

    // Property-target sinks: `el.innerHTML = x`. Matched on the member
    // expression, but only in assignment-target position — *reading*
    // el.innerHTML is harmless and must not match.
    if (node.type === 'MemberExpression') {
      if (node.parent?.type !== 'AssignmentExpression' || node.parent.left !== node) return null

      const name = getPropertyName(node, scopeOf(node))
      if (name === null) return null

      // An optional receiver constraint keeps property sinks from matching
      // every object with that property name (location.href vs link.href).
      return known.sinks.find(sink =>
        matchesPattern(sink.root.property, String(name)) &&
        (!sink.root.receiver || matchesReceiver(node.object, sink.root.receiver))
      ) ?? null
    }

    if (node.callee.type === 'Identifier')
      return known.sinks.find(sink => sink.root.module && matchesModuleSink(node.callee, sink.root)) ?? null

    // Method-rooted sinks require a receiver. A bare `query(sql)` or
    // `exec(cmd)` is far more likely to be something else entirely, and a
    // database handle is essentially always a receiver in real code.
    if (node.callee.type !== 'MemberExpression') return null

    const name = getPropertyName(node.callee, scopeOf(node.callee))
    if (name === null) return null

    return known.sinks.find(sink =>
      matchesPattern(sink.root.method, String(name)) &&
      (!sink.root.receiver || matchesReceiver(node.callee.object, sink.root.receiver))
    ) ?? null
  }

  /**
   * Module-rooted sinks bind to where the function *came from*, which is
   * tighter than any method-name heuristic can be: `exec` destructured out of
   * child_process is unambiguous in a way a bare `exec(...)` call never is.
   *
   * Three binding shapes are resolved:
   *   import { exec } from 'child_process'
   *   const { exec } = require('child_process')      (also renamed)
   *   const exec = require('child_process').exec
   */
  function matchesModuleSink(identifier, root) {
    const variable = referenceFor(identifier)?.resolved
    const definition = variable?.defs[0]
    if (!definition) return false

    if (definition.type === 'ImportBinding') {
      if (!matchesPattern(root.module, definition.parent.source.value)) return false

      const imported = definition.node.imported
      const importedName = imported?.type === 'Identifier' ? imported.name : imported?.value
      return root.name.test(String(importedName ?? identifier.name))
    }

    if (definition.type !== 'Variable') return false

    const { module, name } = requiredBy(definition)
    return matchesPattern(root.module, module) && name !== null && root.name.test(name)
  }

  /** Where does this require()-derived binding get its value? */

  function requiredBy(definition) {
    const declarator = definition.node?.type === 'VariableDeclarator' ? definition.node : null
    if (!declarator || !declarator.init) return {}

    const segments = patternSegments(definition.name, declarator)
    if (segments === null) return {}

    // `const { exec } = require('child_process')` — the export name is the
    // outermost pattern segment; deeper segments would be sub-objects of an
    // export, which is not how these modules are shaped.
    if (segments.length > 0 && isRequireCall(declarator.init))
      return { module: requiredModule(declarator.init), name: segments[0] }

    // `const exec = require('child_process').exec`
    const init = declarator.init
    if (segments.length === 0 && init.type === 'MemberExpression') {
      const base = init.object
      if (!isRequireCall(base)) return {}
      const property = getPropertyName(init, scopeOf(init))
      return property === null ? {} : { module: requiredModule(base), name: String(property) }
    }

    // `const cp = require('child_process')` binds the whole module; its member
    // calls go through the MemberExpression path above and need no entry here.
    return {}
  }

  /**
   * Pattern path from a declarator's binding to this binding's name.
   * `const { a: { b } } = ...` -> ['a', 'b']; flat `const x = ...` -> [].
   */
  function patternSegments(name, declarator) {
    const segments = []
    let current = name

    while (current !== declarator.id) {
      const parent = current?.parent

      if (parent?.type === 'Property' && parent.value === current) {
        segments.unshift(getPropertyName(parent))
      } else if (parent?.type === 'ObjectPattern' || parent?.type === 'ArrayPattern' || parent?.type === 'AssignmentPattern') {
        // Pattern plumbing between the property key and this binding.
      } else {
        return null
      }

      current = parent
    }

    return segments.map(segment => segment === undefined || segment === null ? '*' : String(segment))
  }

  function isRequireCall(node) {
    return node?.type === 'CallExpression'
      && node.callee.type === 'Identifier'
      && node.callee.name === 'require'
      && node.arguments[0]?.type === 'Literal'
  }

  function requiredModule(node) {
    return node.arguments[0].value
  }

  /**
   * Constrain a name-collision-prone sink to plausible receivers. `exec` is the
   * motivating case: `db.exec(sql)` is a SQL sink and `child_process.exec(cmd)`
   * is a shell sink, and reporting the wrong vulnerability class is worse than
   * reporting nothing.
   */
  function matchesReceiver(object, pattern) {
    if (object.type === 'Identifier') return pattern.test(object.name)
    if (object.type === 'MemberExpression') {
      const name = getPropertyName(object, scopeOf(object))
      return name !== null && pattern.test(String(name))
    }
    return false
  }

  // --- resolution ----------------------------------------------------------

  function resolveIdentifier(node) {
    // Inside a helper summary, a parameter name means the taint of the
    // argument the call actually passed. An untainted binding yields an
    // untainted result — which is correct, not optimistic: whatever else
    // that name resolves to is irrelevant, because the value flowing here
    // came from the argument.
    if (bindingScope?.has(node.name)) {
      const boundTaint = bindingScope.get(node.name)
      if (!boundTaint) return null
      return hop(boundTaint, {
        node,
        kind: 'methodName',
        label: node.name,
        penalty: 0,
      })
    }

    const source = sourceForIdentifier(node)
    if (source) return startTaint(source, node)

    const variable = referenceFor(node)?.resolved
    if (!variable) return null

    const definition = variable.defs[0]
    if (!definition) return null

    // A parameter that is not a registered source tells us nothing about its
    // *incoming* value in phase 1 — marking every parameter tainted is the
    // classic way to make a SAST tool unusable. But an assignment *to* it that
    // we can see is an ordinary write and is followed like any other, which is
    // what catches `req = req.body`.
    if (definition.type === 'Parameter') return combineWrites(variable, node)
    if (definition.type === 'ImportBinding') return null

    if (definition.type === 'Variable' && definition.name !== definition.node.id) {
      return resolveDestructured(definition)
    }

    return combineWrites(variable, node)
  }

  function resolveDestructured(definition) {
    const { root, path, paramIndex } = resolvePatternPath(definition.name)

    // A destructured parameter (`function handler({ query })`) has no name for
    // the heuristic to match, so phase 1 cannot see it. Documented limitation.
    if (!root || paramIndex !== undefined) return null

    if (path.some(segment => known.nonPropagatingProperties.includes(segment))) return null

    const rootTaint = taintOf(root)
    if (!rootTaint) {
      // The root is not itself tainted, but root + path may name a source:
      // `const { search } = location`.
      const source = matchSourcePath(root, path)
      return source ? startTaint(source, definition.name) : null
    }

    return hop(rootTaint, {
      node: definition.name,
      kind: 'destructure',
      label: path.join('.'),
      penalty: PENALTY.destructure,
    })
  }

  function matchSourcePath(root, path) {
    return known.sources.find(source => isPrefix(source.path, path) && matchesRoot(source, root)) ?? null
  }

  function combineWrites(variable, node) {
    const writes = variable.references.filter(reference => reference.isWrite() && reference.writeExpr)
    if (!writes.length) return null

    const worst = combine(writes.map(reference => taintFromWrite(reference, variable)))
    if (!worst) return null

    // The multi-write penalty prices flow-insensitivity: with several writes we
    // may be reading a value that a later assignment replaced. A compound
    // assignment cannot replace anything — `sql += ' LIMIT 1'` accumulates onto
    // the previous value — so it is not a competing write and must not be
    // charged as one. Without this, the textbook `let sql = '...' + input; sql
    // += '...'` lands at 0.51 and is one small tweak away from being dropped.
    const competing = writes.filter(reference => !reference.isReadWrite())
    const contested = competing.length > 1

    return hop(worst, {
      node,
      kind: contested ? 'multiWrite' : 'read',
      label: variable.name,
      penalty: contested ? PENALTY.multiWrite : PENALTY.read,
    })
  }

  /**
   * For `q += rhs`, Reference.writeExpr is the RHS *only*. Reading "the last
   * write" of `q` therefore yields a bare literal and misses the injection
   * entirely — the single most likely place in this file to introduce a silent
   * false negative. A read-write reference is `previous ⊕ writeExpr`.
   */
  function taintFromWrite(reference, variable) {
    const written = taintOf(reference.writeExpr)
    if (!reference.isReadWrite()) return written

    const previous = previousWriteTaint(reference, variable)
    return combine([written, previous])
  }

  function previousWriteTaint(reference, variable) {
    // ponytail: positional, not flow-correct. Comparing source positions is not
    // the same as knowing which write executed, so this cuts both ways: it can
    // miss a loop-carried taint (`q += x` where x becomes tainted on a later
    // iteration) *and* it can attribute an earlier write to a compound
    // assignment that a branch never reached. Needs a CFG to do properly.
    const earlier = variable.references.filter(other =>
      other !== reference &&
      other.isWrite() &&
      other.writeExpr &&
      other.identifier.range[0] < reference.identifier.range[0]
    )

    return combine(earlier.map(other => taintOf(other.writeExpr)))
  }

  function resolveMember(node) {
    // Before source matching, not after: with prefix-matching source paths,
    // `req.query.q.length` would otherwise match the `req.query` source and be
    // reported as a tainted string when it is a number.
    const name = getPropertyName(node, scopeOf(node))
    if (name && known.nonPropagatingProperties.includes(name)) return null

    const source = sourceForMember(node)
    if (source) return startTaint(source, node)

    const objectTaint = taintOf(node.object)
    if (!objectTaint) return null

    return hop(objectTaint, {
      node,
      kind: name ? 'member' : 'computedMember',
      label: name ? String(name) : '[computed]',
      penalty: name ? PENALTY.member : PENALTY.computedMember,
    })
  }

  function resolveTemplate(node) {
    return worstOf(node.expressions, node, 'template', PENALTY.template)
  }

  function resolveBinary(node) {
    // Only `+` can build an injectable string. Arithmetic yields numbers and
    // comparison yields booleans — a free precision win with no type info.
    if (node.operator !== '+') return null
    return worstOf([node.left, node.right], node, 'concat', PENALTY.concat)
  }

  function resolveConditional(node) {
    if (isAllowlistProven(node)) return null
    return worstOf([node.consequent, node.alternate], node, 'ternary', PENALTY.ternary)
  }

  /**
   * `ALLOWED.includes(v) ? v : fallback` — and the negated, swapped form.
   *
   * The consequent is only evaluated when `v` is a member of `ALLOWED`, so if
   * `ALLOWED` folds to a statically-known collection of primitives the result is
   * provably one of those primitives, whatever `v` came from. That is a proof,
   * not a heuristic, which is the bar this file sets for clearing taint.
   *
   * It matters because this is the canonical *correct* way to write a dynamic
   * `ORDER BY`, the one case parameter binding cannot cover. Reporting it meant
   * rejecting the version developers actually write while staying quiet on the
   * lookup-table version — pushing people away from the safe pattern.
   *
   * Deliberately narrow: only a ternary. The early-return form
   * (`if (!ALLOWED.includes(v)) return`) needs flow sensitivity and remains a
   * documented false positive.
   */
  function isAllowlistProven(node) {
    const test = unwrap(node.test)

    if (test.type === 'UnaryExpression' && test.operator === '!')
      return isMembershipCheckOf(unwrap(test.argument), node.alternate)

    return isMembershipCheckOf(test, node.consequent)
  }

  function isMembershipCheckOf(test, guarded) {
    if (test.type !== 'CallExpression' || test.callee.type !== 'MemberExpression') return false

    const method = getPropertyName(test.callee, scopeOf(test.callee))
    if (method !== 'includes' && method !== 'has') return false

    const [candidate] = test.arguments
    if (!candidate || !guarded) return false

    // Text comparison rather than structural: the guarded expression has to be
    // the *same* expression that was checked, and anything subtler than
    // textual identity is not something we should be claiming to prove.
    if (sourceCode.getText(candidate) !== sourceCode.getText(unwrap(guarded))) return false

    return isPrimitiveCollection(test.callee.object)
  }

  /**
   * The path-traversal remediation this file's own rule recommends:
   * `resolved.startsWith(base + path.sep)`. The guarded expression must be
   * the *receiver* here, not an argument — `resolved.startsWith(x)`, not
   * `x.startsWith(resolved)` — and the prefix must itself be untainted, or
   * an attacker picks a path that starts with their own chosen prefix and
   * the check proves nothing.
   */
  function isContainmentCheckOf(test, guarded) {
    if (test.type !== 'CallExpression' || test.callee.type !== 'MemberExpression') return false

    const method = getPropertyName(test.callee, scopeOf(test.callee))
    if (method !== 'startsWith') return false

    if (!guarded || sourceCode.getText(test.callee.object) !== sourceCode.getText(unwrap(guarded))) return false

    const [prefix] = test.arguments
    return Boolean(prefix) && !taintOf(prefix)
  }

  function isPrimitiveCollection(node) {
    const folded = getStaticValue(node, scopeOf(node))
    if (!folded) return false

    const values =
      Array.isArray(folded.value) ? folded.value :
      folded.value instanceof Set ? [...folded.value] :
      null

    return Boolean(values?.length) && values.every(value =>
      value === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof value)
    )
  }

  function resolveLogical(node) {
    // `a && b` evaluates to `a` only when `a` is falsy, and a falsy value
    // reaching a string sink is not exploitable — so only `b` matters.
    const branches = node.operator === '&&' ? [node.right] : [node.left, node.right]
    return worstOf(branches, node, 'logical', PENALTY.logical, node.operator)
  }

  function resolveTaggedTemplate(node) {
    // Some tags parameterize their interpolations: `sql`...``, Drizzle's
    // `sql`...``, `prisma.$queryRaw`...``. That is exactly why Prisma's safe
    // raw APIs are tagged and its unsafe ones take a plain string — for
    // those, "no taint" is the correct answer, not a miss.
    //
    // `groq` (the npm package, not a Sanity-specific dialect of the tag
    // syntax) is the opposite: its default export is a verified no-op —
    // `(strings, ...keys) => strings.reduce concatenation` — that exists
    // purely for editor syntax highlighting. A tagged template using it is
    // exactly as injectable as the same interpolations in a plain template
    // literal, and it is the dominant way GROQ queries are actually written
    // in every project surveyed (~1600 call sites, vs. single digits for a
    // bare template literal). Bailing here would make every one of them a
    // wall no rule could ever see through. Recognized by bare tag name, the
    // same trust shape this codebase already accepts for root.helper
    // sanitizers — worth it once verified, not import-traced.
    if (node.tag.type === 'Identifier' && node.tag.name === 'groq') {
      return worstOf(node.quasi.expressions, node, 'template', PENALTY.template)
    }

    // Not every tag parameterizes, though — `String.raw` is plain string
    // building, and a user-defined tag can be anything. Treating an
    // unrecognised tag as an unknown call is the same wall as resolveCall,
    // so the failure is a missed finding rather than a false one, but it is
    // a real miss and it is listed in the rule's documented limitations.
    bail('taggedTemplate')
    return null
  }

  function resolveCall(node) {
    const sanitizer = sanitizerFor(node.callee)
    if (sanitizer) return resolveSanitizerCall(node, sanitizer)

    const propagator = propagatorFor(node)
    if (propagator) return resolvePropagatorCall(node, propagator)

    // Same-file helper functions get a computed summary instead of a wall:
    // their return statements are evaluated with parameters bound to the
    // actual call arguments, so `function pick(x) { return x.trim() }`
    // propagates taint exactly rather than being an unknown call.
    const localFunction = localFunctionFor(node.callee)
    if (localFunction) return summarizeCall(localFunction, node)

    // The member-callee sibling: `const utils = { clean: x => x.trim() };
    // utils.clean(tainted)`. Resolvable without receiver type information
    // in the one case that matters — the receiver is a same-file object
    // literal, not a class instance or a parameter of unknown shape.
    const localMethod = localMethodFor(node.callee)
    if (localMethod) return summarizeCall(localMethod, node)

    // Cross-file, one hop: a named import resolved to a relative or
    // root-slash specifier gets the same summary treatment, evaluated by
    // that file's own analysis instance. Returns null (not a distinct
    // sentinel) when the callee isn't an eligible import-bound call at
    // all, so this falls through to the generic wall below exactly like
    // every other non-match here.
    const crossFile = resolveCrossFileCall(node)
    if (crossFile) return crossFile.taint

    // An unknown function call breaks the chain. It is a wall, not a penalty:
    // reporting through arbitrary unknown functions is the single largest
    // source of false positives in every tool that does it.
    bail('unknownCall')
    return null
  }

  /**
   * `new URLSearchParams(location.search)` etc: a tainted argument taints the
   * constructed object, gated by constructor name so a blanket NewExpression
   * rule does not taint every object built from user input.
   */
  function resolveNew(node) {
    const propagator = constructPropagatorFor(node)
    if (propagator) return resolvePropagatorConstruct(node, propagator)

    bail('unknownConstruct')
    return null
  }

  function constructPropagatorFor(node) {
    if (node.callee.type !== 'Identifier') return null
    return known.propagators.find(propagator =>
      propagator.construct && isGlobalConstructorNamed(node.callee, propagator.construct)
    ) ?? null
  }

  function resolvePropagatorConstruct(node, propagator) {
    const candidates = []
    if (propagator.args === 'all') candidates.push(...node.arguments)
    else if (Array.isArray(propagator.args)) candidates.push(...propagator.args.map(i => node.arguments[i]))

    return worstOf(candidates, node, 'methodName', PENALTY.methodName, node.callee.name)
  }

  /**
   * Resolve a callee to a function declared in this file: a FunctionDeclaration
   * name or a variable initialized with a function expression/arrow.
   * A callee whose receiver has any shape other than a same-file object
   * literal (`obj.helper()` on a class instance, a function parameter, an
   * imported module) is out of scope — resolving those needs receiver type
   * information phase 1 does not have. See localMethodFor for the one
   * member-callee shape that doesn't need it.
   */
  function localFunctionFor(callee) {
    if (callee.type !== 'Identifier') return null

    const variable = referenceFor(callee)?.resolved
    const definition = variable?.defs[0]
    if (!definition) return null

    if (definition.type === 'FunctionName') return definition.node
    if (definition.type === 'Variable') {
      const init = definition.node.init
      if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') return init
    }
    return null
  }

  /**
   * `obj.helper(x)` where `obj` is a same-file object literal and `helper`
   * is one of its function-valued properties (arrow, function expression,
   * or shorthand method — all the same node shape as a Property's value).
   * One hop only: `obj` must resolve directly to the object literal, not
   * through a chain of aliases, matching the resolution depth used
   * everywhere else in this file.
   */
  function localMethodFor(callee) {
    if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') return null

    const name = getPropertyName(callee, scopeOf(callee))
    if (name === null) return null

    const variable = referenceFor(callee.object)?.resolved
    const definition = variable?.defs[0]
    const init = definition?.type === 'Variable' ? definition.node.init : null
    if (init?.type !== 'ObjectExpression') return null

    const property = init.properties.find(candidate =>
      candidate.type === 'Property' && getPropertyName(candidate, scopeOf(candidate)) === String(name)
    )
    const value = property?.value
    if (value?.type === 'ArrowFunctionExpression' || value?.type === 'FunctionExpression') return value
    return null
  }

  /**
   * `import { clean } from './stringHelpers'; clean(tainted)` — one hop
   * across a file boundary. Reads and parses the target file itself
   * (cached by path, process-lifetime) rather than depending on ESLint
   * having already linted it, so this works regardless of lint order or a
   * partial/single-file run.
   *
   * Scope, deliberately: relative (`./`, `../`) and root-slash (`/x`, the
   * Kaliber convention) specifiers only. A bare specifier (an npm package)
   * never resolves here — a dependency should never be trusted just
   * because it was importable, that is what registry entries are for.
   * Default and namespace imports stay unmatched too: this only proves
   * anything for a *named* export, where "the export called X" is
   * unambiguous.
   *
   * Returns null — not a distinct sentinel — when the callee isn't an
   * eligible import-bound call at all, so resolveCall's fallthrough to the
   * generic unknown-call wall is unchanged for everything else.
   */
  function resolveCrossFileCall(node) {
    const target = resolveCrossFileTarget(node)
    if (!target) return null

    // A→B→A mutual recursion across files: the same guard taintOf already
    // uses for a single file's AST nodes, keyed here by path+export because
    // there is no shared node identity across two analysis instances.
    // Prefixed so this doesn't collide with reachableSinksOf's own use of
    // the same set for the same target — they are independent questions
    // ("what does the return value carry" vs "what sinks does calling this
    // reach") and one being mid-resolution must not block the other.
    const cycleKey = `return::${target.targetPath}::${target.importedName}`
    if (crossFileInProgress.has(cycleKey)) return { taint: null }

    crossFileInProgress.add(cycleKey)
    try {
      const targetAnalysis = analyze(target.targetSourceCode, options, target.targetPath)
      const argumentTaints = node.arguments.map(argument => taintOf(argument))
      const taint = targetAnalysis.summarizeExport(target.importedName, argumentTaints, {
        node: node.callee,
        label: getCalleeLabel(node.callee),
      })
      return { taint }
    } finally {
      crossFileInProgress.delete(cycleKey)
    }
  }

  /** The shared first half of every cross-file resolution: specifier -> a real file, read and parsed. */
  function resolveCrossFileTarget(node) {
    if (node.callee.type !== 'Identifier' || !filename) return null

    const variable = referenceFor(node.callee)?.resolved
    const info = crossFileImportInfo(variable?.defs[0])
    if (!info) return null

    const targetPath = resolveModulePath(info.specifier, filename, options.sourceRoot)
    if (!targetPath) return null

    const targetSourceCode = readCrossFileSourceCode(targetPath)
    if (!targetSourceCode) return null

    return { targetPath, importedName: info.importedName, targetSourceCode }
  }

  /**
   * Two binding shapes name both a module specifier and the *original*
   * exported name in one place: `import { X } from '...'`, and
   * `const { X } = require('...')` (also renamed locally, in either form —
   * the original name is what findExport needs, not the local one). A
   * namespace-style require (`const ns = require('...'); ns.method()`) is
   * a member callee, not an Identifier one, so it never reaches here — a
   * deliberate, narrower exclusion than the destructured forms, matching
   * this feature's one-hop-of-certainty bar rather than guessing through
   * an extra layer of indirection.
   */
  function crossFileImportInfo(definition) {
    if (definition?.type === 'ImportBinding') {
      const imported = definition.node.imported
      const importedName = imported?.type === 'Identifier' ? imported.name : (imported?.value ?? null)
      if (!importedName) return null
      return { specifier: String(definition.parent.source.value), importedName }
    }

    if (definition?.type === 'Variable') {
      const init = definition.node.init
      const isRequireCall = init?.type === 'CallExpression'
        && init.callee?.type === 'Identifier' && init.callee.name === 'require'
        && init.arguments[0]?.type === 'Literal'
      if (!isRequireCall) return null

      const property = definition.name.parent
      if (property?.type !== 'Property') return null
      const importedName = property.key?.type === 'Identifier' ? property.key.name
        : property.key?.type === 'Literal' ? String(property.key.value) : null
      if (!importedName) return null

      return { specifier: String(init.arguments[0].value), importedName }
    }

    return null
  }

  /**
   * Evaluate the helper's return expressions with its parameters bound to the
   * call's arguments. Returns the combined taint of everything the helper can
   * give back — including values it pulls from registered sources itself,
   * which fall out of ordinary resolution inside the body.
   */
  function summarizeCall(fnNode, callNode) {
    // Bindings hold the *taint values* of the arguments, captured before any
    // scope switch: evaluating them lazily under a nested summary would
    // resolve parameter names against the wrong bindings.
    const bindings = new Map()
    fnNode.params.forEach((param, index) => {
      bindParam(param, callNode.arguments[index] ?? null, bindings)
    })

    return summarizeWithBindings(fnNode, bindings, {
      node: callNode.callee,
      label: getCalleeLabel(callNode.callee),
    })
  }

  /**
   * The part of summarizeCall that both the same-file and cross-file paths
   * share: evaluate a function's return expressions with a given parameter
   * binding in effect. What differs between them is only how the bindings
   * get built — see bindParam (same file: the argument is an AST node this
   * analysis can taintOf) and bindParamFromTaint (cross file: the argument
   * was already resolved by the *caller's* analysis instance, so only its
   * taint value crosses the file boundary, never the node).
   */
  function summarizeWithBindings(fnNode, bindings, { node, label }) {
    let returns = returnsCache.get(fnNode)
    if (!returns) {
      // An expression-bodied arrow has no return statement: its whole body
      // is the return value.
      returns = []
      if (fnNode.type === 'ArrowFunctionExpression' && fnNode.body.type !== 'BlockStatement') {
        returns.push(fnNode.body)
      } else {
        collectReturns(fnNode.body, returns)
      }
      returnsCache.set(fnNode, returns)
    }

    const previousBindings = bindingScope
    bindingScope = bindings
    try {
      const combined = combine(returns.map(returnArgument => taintOf(returnArgument)))
      if (!combined) return null
      return hop(combined, { node, kind: 'methodName', label, penalty: PENALTY.methodName })
    } finally {
      bindingScope = previousBindings
    }
  }

  /**
   * The export a cross-file call resolved to, summarized against taint
   * values the *caller's* analysis already computed for the call's
   * arguments — this analysis instance never sees the caller's AST at all,
   * only these precomputed values, which is what makes it safe to run
   * against a file nobody asked to lint.
   */
  function summarizeExport(exportedName, argumentTaints, labelInfo) {
    const fnNode = findExport(sourceCode.ast, exportedName)
    if (!fnNode) return null

    const bindings = new Map()
    fnNode.params.forEach((param, index) => {
      bindParamFromTaint(param, argumentTaints[index] ?? null, bindings)
    })

    return summarizeWithBindings(fnNode, bindings, labelInfo)
  }

  /**
   * The mirror image of summarizeCall: that asks what taint flows *out*
   * through a called function's return value, this asks what sinks of a
   * given kind become reachable *inside* a called function's body when it
   * is invoked with these arguments. A rule visiting a plain business-logic
   * call — `getUserSelection({ userId: req.params.userId })` — sees
   * nothing at that node from sinkAt alone, because the sink is not there;
   * it is one or more calls deep, inside a function this file (or another
   * one) declares. Without this, every taint-based rule is blind to
   * exactly the shape a request handler that delegates to a separate
   * domain/data layer takes — which is not a corner case, it is the
   * ordinary way to structure a route handler.
   *
   * Returns an array (a function body can reach more than one matching
   * sink) of `{ sink, taint, sinkLabel }`, empty when the callee is not a
   * resolvable function, has no reachable sink of this kind, or every
   * candidate is sanitized. Transitive and cross-file: a call inside the
   * body to another resolvable function is followed the same way,
   * one function at a time, bounded by the same cycle guards used for
   * return-value resolution (same-file: function node identity; cross
   * file: path+export, since there is no shared node identity across two
   * analysis instances).
   */
  function reachableSinksOf(node, kind) {
    if (node.type !== 'CallExpression') return []

    // Only the outermost call dedupes; a call reached while a walk is
    // already in progress just contributes into it. Without this split,
    // the same shared function reached by two different paths (the
    // ordinary shape of two callers sharing a helper) would be reported
    // twice — see sinksReachableInBody's sink match.
    if (sinkScanDepth > 0) return reachableSinksOfWithin(node, kind)

    sinkScanDepth++
    try {
      const seen = new Set()
      return reachableSinksOfWithin(node, kind).filter(found => {
        if (seen.has(found.sinkNode)) return false
        seen.add(found.sinkNode)
        return true
      })
    } finally {
      sinkScanDepth--
    }
  }

  function reachableSinksOfWithin(node, kind) {
    const localFunction = localFunctionFor(node.callee)
    if (localFunction) {
      const bindings = new Map()
      localFunction.params.forEach((param, index) => bindParam(param, node.arguments[index] ?? null, bindings))
      return sinksReachableInLocalBody(localFunction, bindings, kind, node.callee)
    }

    const localMethod = localMethodFor(node.callee)
    if (localMethod) {
      const bindings = new Map()
      localMethod.params.forEach((param, index) => bindParam(param, node.arguments[index] ?? null, bindings))
      return sinksReachableInLocalBody(localMethod, bindings, kind, node.callee)
    }

    return reachableSinksOfCrossFile(node, kind)
  }

  /**
   * A stable string for "this function, called with taint shaped like
   * this" — confidence and sanitized-kinds only, not the taint's path, so
   * two structurally different derivations of the same confidence still
   * share one walk. Good enough to skip repeat work; not a taint identity.
   */
  function bindingSignature(bindings, kind) {
    return kind + '#' + [...bindings.entries()]
      .map(([name, taint]) => `${name}:${taint ? `${taint.confidence}|${[...taint.sanitizedFor].sort().join('+')}` : '-'}`)
      .join(',')
  }

  function sinksReachableInLocalBody(fnNode, bindings, kind, calleeNode) {
    // Same-file mutual recursion (`function a(x){ b(x) } function b(x){ a(x) }`,
    // neither containing a sink) would otherwise walk forever — the
    // same shape of problem crossFileInProgress solves across files,
    // needed here too because this walk, unlike taintOf's node-level
    // inProgress guard, revisits whole function bodies rather than single
    // expressions.
    if (sinkScanInProgress.has(fnNode)) return []

    const signature = bindingSignature(bindings, kind)
    const memoized = sinkScanMemo.get(fnNode)
    if (memoized?.has(signature)) return memoized.get(signature)

    sinkScanInProgress.add(fnNode)
    let result
    try {
      result = sinksReachableInBody(fnNode, bindings, kind, calleeNode)
    } finally {
      sinkScanInProgress.delete(fnNode)
    }

    if (memoized) memoized.set(signature, result)
    else sinkScanMemo.set(fnNode, new Map([[signature, result]]))
    return result
  }

  function reachableSinksOfCrossFile(node, kind) {
    const target = resolveCrossFileTarget(node)
    if (!target) return []

    const cycleKey = `sinks::${target.targetPath}::${target.importedName}`
    if (crossFileInProgress.has(cycleKey)) return []

    crossFileInProgress.add(cycleKey)
    try {
      const targetAnalysis = analyze(target.targetSourceCode, options, target.targetPath)
      const argumentTaints = node.arguments.map(argument => taintOf(argument))
      // The label is resolved *here*, from this (the caller's) sourceCode,
      // before crossing the file boundary — the target analysis instance
      // must never receive a node it would need to read text from, the
      // exact bug fixed in hop() applies here one level earlier.
      return targetAnalysis.sinksReachableInExport(target.importedName, argumentTaints, kind, getCalleeLabel(node.callee))
    } finally {
      crossFileInProgress.delete(cycleKey)
    }
  }

  /**
   * Cross-file entry point, mirroring summarizeExport but for sink
   * reachability. Memoized on `sinkExportMemo`, which — like the
   * same-file `sinkScanMemo` above — is never reset: this analysis
   * instance is itself cached by SourceCode (see `analyze`), so the same
   * target module imported and called from several call sites, or
   * several times from one, reuses this exact instance and must not
   * re-walk its body once per call.
   */
  function sinksReachableInExport(exportedName, argumentTaints, kind, calleeLabel) {
    const signature = `${exportedName}#${kind}#${argumentTaints.map(taint => taint ? `${taint.confidence}|${[...taint.sanitizedFor].sort().join('+')}` : '-').join(',')}`
    if (sinkExportMemo.has(signature)) return sinkExportMemo.get(signature)

    const fnNode = findExport(sourceCode.ast, exportedName)
    if (!fnNode) return []

    const bindings = new Map()
    fnNode.params.forEach((param, index) => {
      bindParamFromTaint(param, argumentTaints[index] ?? null, bindings)
    })

    // A fresh top-level dedup scope for this export's own walk — the same
    // reason reachableSinksOf applies one for a same-file entry call. The
    // walk itself still shares the persistent sinkScanMemo above.
    sinkScanDepth++
    const seen = new Set()
    let result
    try {
      result = sinksReachableInBody(fnNode, bindings, kind, null, calleeLabel).filter(found => {
        if (seen.has(found.sinkNode)) return false
        seen.add(found.sinkNode)
        return true
      })
    } finally {
      sinkScanDepth--
    }

    sinkExportMemo.set(signature, result)
    return result
  }

  /**
   * Walk fnNode's body for calls matching a registered sink of `kind`,
   * resolving each match's argument taint under `bindings`. A call that is
   * not itself a matching sink but resolves to another local or cross-file
   * function is followed transitively via reachableSinksOf — the same
   * function this one is called from, so the cycle guards above apply
   * uniformly regardless of how deep the chain goes.
   *
   * Does not descend into a nested function expression: its calls are
   * evaluated on their own terms wherever *they* are called, the same
   * boundary collectReturns already draws for the return-value direction.
   */
  function sinksReachableInBody(fnNode, bindings, kind, calleeNode, calleeLabel) {
    const previousBindings = bindingScope
    bindingScope = bindings
    const found = []
    try {
      walk(fnNode.body)
    } finally {
      bindingScope = previousBindings
    }
    return found

    function walk(node) {
      if (!node || typeof node.type !== 'string') return
      if (isFunctionNode(node) && node !== fnNode) return

      if (node.type === 'CallExpression') {
        const sink = sinkAt(node)
        if (sink?.requires === kind) {
          const argument = node.arguments[sink.argument]
          const rawTaint = argument && taintOf(argument)
          // A same-file sink whose argument taint doesn't actually depend on
          // the call's bindings (a closure over an outer tainted variable,
          // not the parameter) is already found by this file's own direct
          // AST traversal — reporting it again here would double-report the
          // exact same call. Re-resolve with no binding context active; if
          // that alone finds a flow at least as confident as the bound one,
          // this walk contributes nothing new. A *lower*-confidence ambient
          // source (one this file's own traversal would report, if at all,
          // at a different confidence) must not swallow a genuinely more
          // confident bound flow — that would silence the exact finding
          // this mechanism exists to surface.
          if (
            rawTaint && !rawTaint.sanitizedFor.has(kind) && !rawTaint.sanitizedFor.has('*') &&
            !resolvesTheSameWithoutBindings(argument, kind, rawTaint.confidence)
          ) {
            const label = calleeLabel ?? getCalleeLabel(calleeNode)
            const taint = hop(rawTaint, { node: calleeNode, kind: 'methodName', label, penalty: PENALTY.methodName })
            if (taint) found.push({ sink, taint, sinkLabel: describeSinkCallee(node.callee), sinkNode: node })
          }
        } else {
          found.push(...reachableSinksOf(node, kind))
        }
      }

      for (const key of Object.keys(node)) {
        if (key === 'parent') continue
        const value = node[key]
        if (Array.isArray(value)) value.forEach(walk)
        else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value)
      }
    }
  }

  function describeSinkCallee(calleeNode) {
    return `${sourceCode.getText(calleeNode)}()`
  }

  function resolvesTheSameWithoutBindings(node, kind, boundConfidence) {
    const previousBindings = bindingScope
    bindingScope = null
    const ambientTaint = taintOf(node)
    bindingScope = previousBindings
    return (
      Boolean(ambientTaint) && !ambientTaint.sanitizedFor.has(kind) && !ambientTaint.sanitizedFor.has('*') &&
      ambientTaint.confidence >= boundConfidence
    )
  }

  /**
   * Bind one parameter to the taint the call actually passed. Two shapes
   * beyond a plain identifier are provable without guessing:
   *
   *   function f(x = 'default') { ... }   — the default only ever applies
   *     when the argument is omitted, so a real argument binds exactly like
   *     a plain identifier would.
   *   function f({ x }) { ... }           — destructuring, but only when
   *     the call site passes an object *literal*: `x` binds to that
   *     specific property's taint, not the whole argument's. Anything else
   *     (a variable, a spread, nested patterns, defaults inside the
   *     pattern, rest elements) stays unbound — a miss, not a guess, the
   *     same bar as everywhere else in this file.
   */
  function bindParam(param, argument, bindings) {
    if (param.type === 'Identifier') {
      bindings.set(param.name, argument ? taintOf(argument) : null)
      return
    }

    if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
      bindings.set(param.left.name, argument ? taintOf(argument) : null)
      return
    }

    if (param.type === 'ObjectPattern' && argument?.type === 'ObjectExpression') {
      for (const property of param.properties) {
        if (property.type !== 'Property' || property.value.type !== 'Identifier') continue

        const name = getPropertyName(property, scopeOf(property))
        if (name === null) continue

        const matched = argument.properties.find(candidate =>
          candidate.type === 'Property' && getPropertyName(candidate, scopeOf(candidate)) === String(name)
        )
        bindings.set(property.value.name, matched ? taintOf(matched.value) : null)
      }
    }
  }

  /**
   * bindParam's cross-file sibling: the argument is a taint *value* the
   * caller already computed, not a node this analysis could taintOf itself.
   * Destructuring can't be matched precisely without the caller's argument
   * shape, which does not cross the file boundary — so it stays unbound
   * here even in the one case bindParam can prove (a literal argument).
   * Narrower than the same-file case on purpose: guessing which property a
   * whole-object taint value belongs to is exactly the false-positive risk
   * bindParam was written to avoid.
   */
  function bindParamFromTaint(param, taintValue, bindings) {
    if (param.type === 'Identifier') {
      bindings.set(param.name, taintValue)
      return
    }

    if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
      bindings.set(param.left.name, taintValue)
    }
  }

  /**
   * Return arguments belonging directly to the function whose body is
   * `node` (always `fnNode.body` at the one call site). Never descends
   * into a nested function (below), so every ReturnStatement this walk
   * reaches is already known to belong to that function, not some inner
   * one — no per-return parent-chain walk needed to confirm it. That walk
   * used to run here anyway (an `enclosingFunctionOf(node) === ownerFn`
   * check, since removed along with the parameter) and dominated a real
   * production profile: ~60% of total samples linting a real bundle file.
   */
  function collectReturns(node, out) {
    if (!node || typeof node.type !== 'string') return

    if (node.type === 'ReturnStatement') {
      out.push(node.argument)
      return
    }
    if (isFunctionNode(node)) {
      // A nested arrow inside the helper is evaluated on its own terms when
      // its calls appear elsewhere; do not descend into it here.
      return
    }

    for (const key of Object.keys(node)) {
      if (key === 'parent') continue
      const value = node[key]
      if (Array.isArray(value)) value.forEach(child => collectReturns(child, out))
      else if (value && typeof value === 'object' && typeof value.type === 'string') collectReturns(value, out)
    }
  }

  function getCalleeLabel(callee) {
    return sourceCode.getText(callee).replace(/\s+/g, ' ')
  }

  function resolveSanitizerCall(node, sanitizer) {
    const taint = taintOf(node.arguments[sanitizer.argument])
    if (!taint) return null

    return {
      ...taint,
      sanitizedFor: new Set([...taint.sanitizedFor, ...sanitizer.clears]),
      confidence: Math.min(taint.confidence, sanitizer.confidence ?? 1),
      path: [...taint.path, { node, kind: 'sanitize', label: sanitizer.id, penalty: PENALTY.sanitize }],
    }
  }

  function resolvePropagatorCall(node, propagator) {
    const candidates = []
    if (propagator.receiver) candidates.push(node.callee.object)
    if (propagator.args === 'all') candidates.push(...node.arguments)
    else if (Array.isArray(propagator.args)) candidates.push(...propagator.args.map(i => node.arguments[i]))

    return worstOf(candidates, node, 'methodName', PENALTY.methodName, propagator.method)
  }

  function sanitizerFor(callee) {
    if (callee.type === 'Identifier') {
      // A local named `Number` shadows the global and must not be trusted.
      const global = known.sanitizers.find(sanitizer => sanitizer.root.global && isGlobalNamed(callee, sanitizer.root.global))
      if (global) return global

      // Helper-rooted sanitizers: bare calls of a name the consumer
      // explicitly declared trustworthy (`root: { helper: 'i18n' }`). The
      // shape itself records that name-trust was a decision, which is what
      // separates this from the forbidden bare-method matching.
      return known.sanitizers.find(sanitizer =>
        matchesPattern(sanitizer.root.helper, callee.name)
      ) ?? null
    }

    if (callee.type === 'MemberExpression') {
      const name = getPropertyName(callee, scopeOf(callee))
      if (name === null) return null

      // The receiver constraint is mandatory for method-rooted sanitizers (the
      // registry refuses to load one without it). `escape` is why: lodash, he
      // and validator all export an HTML escaper by that name, and trusting one
      // of those as a SQL escaper turns detection off silently.
      return known.sanitizers.find(sanitizer =>
        matchesPattern(sanitizer.root.method, String(name)) &&
        (!sanitizer.root.receiver || matchesReceiver(callee.object, sanitizer.root.receiver))
      ) ?? null
    }

    return null
  }

  /**
   * The one place a registry field is compared against an AST value. Consumer
   * entries may use plain strings where built-ins use regexes, and this is the
   * only function that is allowed to know that — every match against a
   * `module`/`name`/`method`/`property`/`helper` field goes through here.
   * Three separate call sites each grew their own copy of this ternary before
   * one of them (propagatorFor) got it wrong and silently stopped matching
   * regex-typed `method` fields; this is that fix, generalized so it can't
   * happen a fourth time.
   */
  function matchesPattern(pattern, value) {
    if (pattern == null || value == null) return false
    if (typeof pattern === 'string') return pattern === value
    return Boolean(pattern.test(value))
  }

  function propagatorFor(node) {
    // Global functions: String(x), decodeURIComponent(x), JSON.stringify(x).
    // The registry previously had no way to express these at all, so
    // `db.query('… ' + String(req.query.id))` propagated nothing.
    if (node.callee.type === 'Identifier')
      return known.propagators.find(propagator => isGlobalNamed(node.callee, propagator.global)) ?? null

    if (node.callee.type !== 'MemberExpression') return null

    const name = getPropertyName(node.callee, scopeOf(node.callee))
    if (name === null) return null

    return known.propagators.find(propagator => {
      if (!matchesPattern(propagator.method, String(name))) return false

      // Namespace-gated propagators (path.join vs Array#join): the receiver
      // object must be the namespace, not a tainted value.
      if (propagator.namespace) {
        const object = node.callee.object
        const objectName = object?.type === 'Identifier'
          ? object.name
          : object?.type === 'MemberExpression' && !object.computed ? object.property?.name : null
        if (!objectName || !propagator.namespace.test(objectName)) return false
      }

      return true
    }) ?? null
  }

  /**
   * Has this expression been passed through a registered sanitizer for the
   * kind? Unlike taintOf — which returns null when the *input* was untainted,
   * indistinguishable from "no sanitizer here" — this answers the question
   * matcher-style rules (no-dangerously-set-inner-html) actually need: was a
   * clearing call made, regardless of whether the argument happened to be
   * tainted.
   */
  function sanitizedAt(node, kind) {
    if (node?.type !== 'CallExpression') return false
    const sanitizer = sanitizerFor(node.callee)
    return Boolean(sanitizer && (sanitizer.clears.includes('*') || sanitizer.clears.includes(kind)))
  }

  // --- helpers -------------------------------------------------------------

  function worstOf(nodes, node, kind, penalty, label = null) {
    const combined = combine(nodes.map(taintOf))
    if (!combined) return null
    return hop(combined, { node, kind, label, penalty })
  }

  function hop(taint, step) {
    if (taint.path.length >= options.maxHops) {
      bail('maxHops')
      return null
    }

    // The label is resolved to a plain string *now*, using this analysis
    // instance's own sourceCode, rather than left for describePath to
    // compute later from `step.node` with whatever sourceCode happens to
    // be reporting. That deferral was fine as long as a taint value never
    // left the file it was built in — cross-file resolution broke it
    // silently: a hop built while summarizing an imported helper carries a
    // node that belongs to the *target* file's AST, and the rule reporting
    // it uses the *caller's* sourceCode. Calling sourceCode.getText() on a
    // foreign node doesn't throw, it just slices the wrong file's text at
    // that node's range — a real, silent, wrong "Flow:" in the message,
    // confirmed by taking `x + '-suffix'` inside a cross-file helper and
    // watching the reported flow describe a random substring of the
    // *importing* file's import statement instead.
    const label = step.label ?? shortText(step.node)

    return {
      ...taint,
      confidence: Math.max(0, taint.confidence - step.penalty),
      path: [...taint.path, { ...step, label }],
    }
  }

  function scopeOf(node) {
    return sourceCode.getScope(node)
  }

  /**
   * `document.URL` -> { root: <document>, path: ['URL'] }
   *
   * A computed segment we cannot fold makes the whole chain unusable for
   * *source matching* — the path would be wrong rather than merely unknown.
   * Taint still propagates through it via resolveMember's object walk.
   */
  function memberChain(node) {
    const path = []
    let current = node

    while (current.type === 'MemberExpression') {
      const name = getPropertyName(current, scopeOf(current))
      if (name === null) return { root: null, path: [] }
      path.unshift(String(name))
      current = unwrap(current.object)
    }

    return { root: current, path }
  }

  function shortText(node) {
    return sourceCode.getText(node).replace(/\s+/g, ' ').trim()
  }

  function bail(reason) {
    stats.bailouts[reason] = (stats.bailouts[reason] ?? 0) + 1
  }

}

/**
 * Merge several tainted values into the one that reaches the sink.
 *
 * The sanitised kinds are **intersected**, and that is the whole point. Two
 * cases, both requiring it:
 *
 *   string building   `escape(a) + encode(b)` contains both parts, so it is
 *                     safe for a kind only if both parts were made safe for it.
 *   alternatives      `cond ? a : b`, or a variable with several writes — one
 *                     of them reaches the sink and we do not know which, so
 *                     only kinds cleared on *every* path may be assumed.
 *
 * Picking a single "worst" value instead was order-dependent and lost findings:
 * `{sql}` and `{url}` are both size one, so the tiebreak could select the
 * branch already safe for the kind the sink cares about and report nothing.
 * Two semantically identical queries differing only in operand order then gave
 * different answers.
 *
 * Confidence takes the *strongest* candidate: if some path reaches the sink at
 * 0.9 then that path exists, and reporting it lower because another path is
 * vaguer would understate a real finding.
 */
function combine(values) {
  const tainted = values.filter(Boolean)
  if (!tainted.length) return null
  if (tainted.length === 1) return tainted[0]

  const strongest = tainted.reduce((a, b) => a.confidence >= b.confidence ? a : b)
  return { ...strongest, sanitizedFor: intersectKinds(tainted.map(value => value.sanitizedFor)) }
}

/** `'*'` is the universal set, so it never narrows the intersection. */
function intersectKinds(sets) {
  const concrete = sets.filter(set => !set.has('*'))
  if (!concrete.length) return new Set(['*'])

  return concrete.reduce((shared, set) => new Set([...shared].filter(kind => set.has(kind))))
}

/** Strip wrappers that cannot change the value. */
function unwrap(node) {
  switch (node.type) {
    case 'ChainExpression': return unwrap(node.expression)
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'TSInstantiationExpression':
      return unwrap(node.expression)
    case 'AwaitExpression': return unwrap(node.argument)
    case 'SequenceExpression': return unwrap(node.expressions.at(-1))
    default: return node
  }
}

/**
 * Recover the member path a destructured binding came from, by walking up the
 * pattern. Subsumes nested, renamed and defaulted destructuring with no special
 * cases for any of them.
 *
 * `const { query: { id = '0' } } = req` -> { root: <req>, path: ['query', 'id'] }
 */
function resolvePatternPath(identifier) {
  const path = []
  let node = identifier
  let parent = node.parent

  while (parent) {
    if (parent.type === 'AssignmentPattern' && parent.left === node) { /* default value: transparent */ }
    else if (parent.type === 'ObjectPattern') { /* transparent */ }
    else if (parent.type === 'Property' && parent.value === node) path.unshift(String(getPropertyName(parent) ?? '*'))
    else if (parent.type === 'ArrayPattern') path.unshift(String(parent.elements.indexOf(node)))
    else if (parent.type === 'RestElement') path.unshift('...')
    else if (parent.type === 'VariableDeclarator' && parent.id === node) return { root: parent.init, path }
    else if (parent.type === 'AssignmentExpression' && parent.left === node) return { root: parent.right, path }
    else if (isFunctionNode(parent)) return { root: parent, path, paramIndex: parent.params.indexOf(node) }
    else return { root: null, path }

    node = parent
    parent = parent.parent
  }

  return { root: null, path }
}

/** Identifier -> Reference, O(1). Built from arrays ESLint already populated. */
function indexReferences(sourceCode) {
  const index = new Map()

  for (const scope of sourceCode.scopeManager.scopes)
    for (const reference of scope.references)
      index.set(reference.identifier, reference)

  return index
}

// --- Cross-file module resolution -------------------------------------------
//
// Everything below is plain data lookup with no dependency on a specific
// analysis instance, so it lives at module scope rather than inside
// createAnalysis.

/**
 * A specifier to an absolute file path, or null if it is out of scope
 * (a bare package specifier — never chase into node_modules) or does not
 * exist on disk under any of the extensions this project uses.
 */
function resolveModulePath(specifier, fromFile, configuredSourceRoot) {
  let base
  if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), specifier)
  } else if (specifier.startsWith('/')) {
    const root = configuredSourceRoot || findDefaultSourceRoot(fromFile)
    if (!root) return null
    base = path.join(root, specifier)
  } else {
    return null
  }

  return resolveExistingFile(base)
}

function resolveExistingFile(base) {
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate
    } catch {
      // Does not exist, or a permission error — either way, not this candidate.
    }
  }
  return null
}

/**
 * Root-slash imports (`/machinery/x`) are a Kaliber convention resolved by
 * `@kaliber/build`'s own webpack config, which this plugin has no access
 * to. Absent an explicit `settings['@kaliber/security'].sourceRoot`, the
 * nearest ancestor package.json's `src` directory is the same guess
 * `@kaliber/build` projects satisfy by convention. Wrong for a differently
 * laid out project, in which case root-slash imports fall back to a wall —
 * the same outcome as before this feature existed.
 */
function findDefaultSourceRoot(fromFile) {
  const startDir = path.dirname(fromFile)
  if (sourceRootCache.has(startDir)) return sourceRootCache.get(startDir)

  let current = startDir
  let found = null
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      found = path.join(current, 'src')
      break
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  sourceRootCache.set(startDir, found)
  return found
}

/**
 * Parse a file nobody asked to lint into a real SourceCode, the same shape
 * every rule already gets from ESLint, so the exact same scope-aware
 * resolution machinery (getPropertyName, findVariable, sourceCode.getScope)
 * works on it unmodified. Cached by path — see the module-level comment
 * above crossFileSourceCache for the invalidation tradeoff.
 */
function readCrossFileSourceCode(absolutePath) {
  if (crossFileSourceCache.has(absolutePath)) return crossFileSourceCache.get(absolutePath)

  let result = null
  try {
    const code = fs.readFileSync(absolutePath, 'utf8')
    let captured = null
    crossFileLinter.verify(code, {
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: {
        capture: { rules: { capture: { create(context) { captured = context.sourceCode; return {} } } } },
      },
      rules: { 'capture/capture': 'error' },
    }, absolutePath)
    result = captured
  } catch {
    result = null
  }

  crossFileSourceCache.set(absolutePath, result)
  return result
}

/**
 * Find a top-level function/arrow declaration by name, unqualified by how
 * it is exported — the shared last step once an export statement has been
 * matched down to "the binding named X".
 */
function findTopLevelBinding(program, name) {
  for (const statement of program.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id?.name === name) return statement

    if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations) {
        if (declarator.id.type !== 'Identifier' || declarator.id.name !== name) continue
        const init = declarator.init
        if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') return init
      }
    }
  }
  return null
}

/**
 * Resolve an exported name to its function node. Four shapes, all
 * name-matching only — `export { local as exported }` and
 * `module.exports = { exported: local }` renames are a documented miss,
 * not guessed at, the same bar as everywhere else in this feature:
 *
 *   export function X() {}
 *   export const X = () => {} / function () {}
 *   export { X }
 *   module.exports = { X }  /  exports.X = ...  /  module.exports.X = ...
 */
function findExport(program, exportedName) {
  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.declaration) {
        const declaration = statement.declaration
        if (declaration.type === 'FunctionDeclaration' && declaration.id?.name === exportedName) return declaration
        if (declaration.type === 'VariableDeclaration') {
          for (const declarator of declaration.declarations) {
            if (declarator.id.type !== 'Identifier' || declarator.id.name !== exportedName) continue
            const init = declarator.init
            if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') return init
          }
        }
        continue
      }

      const specifier = statement.specifiers.find(candidate =>
        candidate.exported.name === exportedName && candidate.local.name === exportedName
      )
      if (specifier) return findTopLevelBinding(program, exportedName)
    }

    if (statement.type === 'ExpressionStatement' && statement.expression.type === 'AssignmentExpression') {
      const found = findCommonJsExport(statement.expression, program, exportedName)
      if (found) return found
    }
  }
  return null
}

function findCommonJsExport(assignment, program, exportedName) {
  const { left, right } = assignment

  // exports.X = ... / module.exports.X = ...
  if (left.type === 'MemberExpression' && !left.computed && isExportsTarget(left.object) && left.property?.name === exportedName) {
    if (right.type === 'ArrowFunctionExpression' || right.type === 'FunctionExpression') return right
    if (right.type === 'Identifier') return findTopLevelBinding(program, right.name)
    return null
  }

  // module.exports = { X } / module.exports = { X: function () {} }
  if (isModuleExports(left) && right.type === 'ObjectExpression') {
    for (const property of right.properties) {
      if (property.type !== 'Property') continue
      const keyName = property.key.type === 'Identifier' ? property.key.name
        : property.key.type === 'Literal' ? String(property.key.value) : null
      if (keyName !== exportedName) continue

      if (property.shorthand) return findTopLevelBinding(program, exportedName)
      if (property.value.type === 'ArrowFunctionExpression' || property.value.type === 'FunctionExpression') return property.value
      if (property.value.type === 'Identifier' && property.value.name === exportedName) return findTopLevelBinding(program, exportedName)
    }
  }

  return null
}

function isExportsTarget(node) {
  return (node.type === 'Identifier' && node.name === 'exports') || isModuleExports(node)
}

function isModuleExports(node) {
  return node.type === 'MemberExpression' && !node.computed
    && node.object.type === 'Identifier' && node.object.name === 'module'
    && node.property.type === 'Identifier' && node.property.name === 'exports'
}
