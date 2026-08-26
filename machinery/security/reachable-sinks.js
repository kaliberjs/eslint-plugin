const { isFunctionNode } = require('../ast')
const { findExport, crossFileInProgress } = require('./module-graph')
const { localFunctionFor, localMethodFor, resolveCrossFileTarget } = require('./callee')
const { calleeText } = require('./expression')
const { collectReturns, paramIdentifierName, bindingSignature, bindParamFromTaint } = require('./summary')
const { PENALTY } = require('./penalty')

/**
 * "This call site passes tainted arguments — does anything *inside* the
 * function it calls reach a sink?" The delegate-to-a-data-layer shape a
 * per-expression resolver cannot see, because the sink may not even be in
 * this file's AST.
 *
 * A leaf of the analysis: the resolver never calls in here, only rules do,
 * which is why this can own its own memos outright. Those memos are the
 * whole reason this is not a naive walk — see sinkScanMemo below.
 *
 * Everything it needs from the resolver arrives through `resolver`, one
 * direction only. `withBindings` is the single piece of shared mutable
 * state, handed over as a function so the save/restore discipline stays in
 * taint.js where the scope itself lives.
 */
module.exports = { createReachableSinks }

function createReachableSinks({ sourceCode, options, filename, sinkAt, resolver }) {
  const {
    analyze, taintOf, hop, withBindings, bindParam, resolvesTheSameWithoutBindings,
  } = resolver

  // Cycle guard for the same-file recursion, keyed by function AST node —
  // the cross-file equivalent of crossFileInProgress, but scoped to this
  // instance since node identity only means anything within one file.
  const sinkScanInProgress = new Set()

  // Memo for the same-file walk, keyed by function node + a signature of the
  // bound parameter taints (bindingSignature already disambiguates `f(x)`
  // from `f('literal')`, so this is safe to keep for the whole instance).
  //
  // Without it, a call graph where two functions each call a shared third one
  // re-walks that shared function once per path to it — exponential in
  // fan-out depth. An ordinary service-layer file with a dozen small
  // functions each calling two others took over twenty seconds to lint.
  // Scoping it to one call was not enough: a real minified bundle visits the
  // same widely-shared helper from tens of thousands of independent call
  // sites, one top-level entry each, and resetting between them meant every
  // one re-walked that helper from scratch. Persistent per instance instead —
  // the whole instance is already cached by SourceCode (see analyze), so a
  // helper imported and called from many places was never going to need
  // re-walking within one lint pass anyway.
  //
  // The imprecision this trades away — two callers of the same helper with
  // confidence-and-sanitized-kind-identical but differently-sourced taint
  // share the first caller's reported flow path — was already an accepted
  // cost of scoping by signature rather than full taint identity; this only
  // widens how often it can happen, not what kind of cost it is.
  const sinkScanMemo = new Map()

  // Whether a walk is already in progress, so only the outermost call applies
  // the per-call-site sink dedup. A separate concern from the memo above,
  // which outlives any single call.
  let sinkScanDepth = 0

  // sinksReachableInExport's persistent twin, for the cross-file case: a
  // module imported and called from several places is the cross-file version
  // of the exact same fan-out.
  const sinkExportMemo = new Map()

  return { reachableSinksOf, sinksReachableInExport }


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
    const localFunction = localFunctionFor(sourceCode, node.callee)
    if (localFunction) return reachableSinksOfLocal(localFunction, node, kind)

    const localMethod = localMethodFor(sourceCode, node.callee)
    if (localMethod) return reachableSinksOfLocal(localMethod, node, kind)

    return reachableSinksOfCrossFile(node, kind)
  }

  /**
   * Same-file only: attaches the concrete call-site argument nodes
   * (`callArguments`, param name -> argument node) to the result *after*
   * the memoized walk returns, never into the memo itself.
   * `sinkScanMemo` is keyed by `bindingSignature` — confidence and
   * sanitized-kinds only — so `api(\`/x/${id}\`)` and `api(\`${id}\`)` share
   * one memo entry despite needing opposite verdicts once a rule inspects
   * the actual expression. Attaching the node to the *shared* memoized
   * array would leak one call site's argument onto every other call site
   * with the same taint shape. `.map` copies; nothing here mutates the
   * memoized value. Only the outermost (innermost-frame) attachment wins,
   * matching how a rule can only usefully substitute one hop of indirection
   * before falling back to today's taint-quality-only behaviour.
   */
  function reachableSinksOfLocal(fnNode, node, kind) {
    const bindings = new Map()
    const callArguments = new Map()
    fnNode.params.forEach((param, index) => {
      const argument = node.arguments[index] ?? null
      bindParam(param, argument, bindings)
      const name = paramIdentifierName(param)
      if (name) callArguments.set(name, argument)
    })

    return sinksReachableInLocalBody(fnNode, bindings, kind, node.callee)
      .map(found => found.callArguments ? found : { ...found, callArguments })
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
    const target = resolveCrossFileTarget({ sourceCode, options, filename }, node)
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
      return targetAnalysis.sinksReachableInExport(target.importedName, argumentTaints, kind, calleeText(sourceCode, node.callee))
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
    const found = []
    withBindings(bindings, () => walk(fnNode.body))
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
            const label = calleeLabel ?? calleeText(sourceCode, calleeNode)
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
}
