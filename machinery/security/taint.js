const { getStaticValue, getPropertyName, findVariable } = require('@eslint-community/eslint-utils')
const { isFunctionNode } = require('../ast')
const { referenceFor, memberChain, shortText, calleeText, unwrap } = require('./expression')
const { collectReturns, paramIdentifierName, bindingSignature, bindParamFromTaint } = require('./summary')
const { isFlowGuarded, isAllowlistProven } = require('./guards')
const { sinkAt } = require('./sinks')
const { sanitizedAt, sanitizerFor } = require('./sanitizers')
const { propagatorFor, constructPropagatorFor } = require('./propagators')
const { sourceAt, sourceForIdentifier, sourceForMember, matchSourcePath, startTaint } = require('./sources')
const { readCrossFileSourceCode, findExport, crossFileInProgress } = require('./module-graph')
const { localFunctionFor, localMethodFor, resolveCrossFileTarget } = require('./callee')
const { PENALTY } = require('./penalty')
const { createReachableSinks } = require('./reachable-sinks')
const registry = require('./registry')



const cache = new WeakMap()


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

  const { reachableSinksOf, sinksReachableInExport } = createReachableSinks({
    sourceCode, options, filename,
    sinkAt: node => sinkAt(known, sourceCode, node),
    resolver: {
      analyze, taintOf, hop, withBindings, bindParam, resolvesTheSameWithoutBindings,
    },
  })

  // The rule-facing API. Everything above is a plain function taking the
  // file's context explicitly; binding it once here is the only thing this
  // closure is still for.
  return {
    taintOf,
    stats,
    summarizeExport,
    reachableSinksOf,
    sinksReachableInExport,
    sinkAt: node => sinkAt(known, sourceCode, node),
    sourceAt: node => sourceAt(known, sourceCode, node),
    sanitizedAt: (node, kind) => sanitizedAt(known, sourceCode, node, kind),
    referenceFor: identifier => referenceFor(sourceCode, identifier),
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

  /**
   * Run `fn` with `bindings` as the active helper-summary parameter bindings,
   * restoring whatever was active before — including on a throw, which the
   * hand-rolled version in resolvesTheSameWithoutBindings did not do, leaking
   * a stale scope into every later resolution in the file.
   *
   * `bindingScope` is the one piece of mutable state shared across the split:
   * summaries and sink-reachability both establish it, and taintOf and
   * resolveIdentifier read it. Passing it as a function rather than as a
   * mutable cell keeps the save/restore discipline in one place.
   */
  /** guards.js asks only whether a value is tainted, never for the value. */
  function isTainted(node) {
    return Boolean(taintOf(node))
  }

  function withBindings(bindings, fn) {
    const previous = bindingScope
    bindingScope = bindings
    try {
      return fn()
    } finally {
      bindingScope = previous
    }
  }

  function resolve(node) {
    const unwrapped = unwrap(node)

    // Cheapest, highest-precision rejection available: a value we can fold to a
    // constant cannot be tainted. This filters most of the safe cases in one
    // call, including `'a' + 'b'` and template literals with no expressions.
    if (getStaticValue(unwrapped, sourceCode.getScope(unwrapped))) return null

    const result = resolveByType(unwrapped)

    // Flow sensitivity, in the shapes this file can prove without a CFG: an
    // allowlist membership guard, or a path-containment guard, over this
    // exact expression. `if (!TABLES.includes(t)) return` and
    // `if (!resolved.startsWith(base)) return` both make every later use
    // of the guarded expression safe.
    if (result && isFlowGuarded(sourceCode, unwrapped, isTainted)) return null

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

  // --- sources -------------------------------------------------------------

  // --- sinks ---------------------------------------------------------------

  /** Where does this require()-derived binding get its value? */

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

    const source = sourceForIdentifier(known, sourceCode, node)
    if (source) return startTaint(sourceCode, source, node)

    const variable = referenceFor(sourceCode, node)?.resolved
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
      const source = matchSourcePath(known, sourceCode, root, path)
      return source ? startTaint(sourceCode, source, definition.name) : null
    }

    return hop(rootTaint, {
      node: definition.name,
      kind: 'destructure',
      label: path.join('.'),
      penalty: PENALTY.destructure,
    })
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
    const name = getPropertyName(node, sourceCode.getScope(node))
    if (name && known.nonPropagatingProperties.includes(name)) return null

    const source = sourceForMember(known, sourceCode, node)
    if (source) return startTaint(sourceCode, source, node)

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
    if (isAllowlistProven(sourceCode, node)) return null
    return worstOf([node.consequent, node.alternate], node, 'ternary', PENALTY.ternary)
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
    const sanitizer = sanitizerFor(known, sourceCode, node.callee)
    if (sanitizer) return resolveSanitizerCall(node, sanitizer)

    const propagator = propagatorFor(known, sourceCode, node)
    if (propagator) return resolvePropagatorCall(node, propagator)

    // Same-file helper functions get a computed summary instead of a wall:
    // their return statements are evaluated with parameters bound to the
    // actual call arguments, so `function pick(x) { return x.trim() }`
    // propagates taint exactly rather than being an unknown call.
    const localFunction = localFunctionFor(sourceCode, node.callee)
    if (localFunction) return summarizeCall(localFunction, node)

    // The member-callee sibling: `const utils = { clean: x => x.trim() };
    // utils.clean(tainted)`. Resolvable without receiver type information
    // in the one case that matters — the receiver is a same-file object
    // literal, not a class instance or a parameter of unknown shape.
    const localMethod = localMethodFor(sourceCode, node.callee)
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
    const propagator = constructPropagatorFor(known, sourceCode, node)
    if (propagator) return resolvePropagatorConstruct(node, propagator)

    bail('unknownConstruct')
    return null
  }

  function resolvePropagatorConstruct(node, propagator) {
    const candidates = []
    if (propagator.args === 'all') candidates.push(...node.arguments)
    else if (Array.isArray(propagator.args)) candidates.push(...propagator.args.map(i => node.arguments[i]))

    return worstOf(candidates, node, 'methodName', PENALTY.methodName, node.callee.name)
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
    const target = resolveCrossFileTarget({ sourceCode, options, filename }, node)
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
        label: calleeText(sourceCode, node.callee),
      })
      return { taint }
    } finally {
      crossFileInProgress.delete(cycleKey)
    }
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
      label: calleeText(sourceCode, callNode.callee),
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

    return withBindings(bindings, () => {
      const combined = combine(returns.map(returnArgument => taintOf(returnArgument)))
      if (!combined) return null
      return hop(combined, { node, kind: 'methodName', label, penalty: PENALTY.methodName })
    })
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

  function resolvesTheSameWithoutBindings(node, kind, boundConfidence) {
    const ambientTaint = withBindings(null, () => taintOf(node))
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

        const name = getPropertyName(property, sourceCode.getScope(property))
        if (name === null) continue

        const matched = argument.properties.find(candidate =>
          candidate.type === 'Property' && getPropertyName(candidate, sourceCode.getScope(candidate)) === String(name)
        )
        bindings.set(property.value.name, matched ? taintOf(matched.value) : null)
      }
    }
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
    const label = step.label ?? shortText(sourceCode, step.node)

    return {
      ...taint,
      confidence: Math.max(0, taint.confidence - step.penalty),
      path: [...taint.path, { ...step, label }],
    }
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

// --- Cross-file module resolution -------------------------------------------
//
// Everything below is plain data lookup with no dependency on a specific
// analysis instance, so it lives at module scope rather than inside
// createAnalysis.
