const { isFunctionNode } = require('../ast')

/**
 * The vocabulary of a *helper summary*: evaluating a function's body with its
 * parameters bound to the taint its caller passed in.
 *
 * All four are shape questions about a function node and a bindings Map, with
 * no reference to the analysis caches — which is why taint.js and
 * reachable-sinks.js can both import them rather than one injecting them into
 * the other.
 */
module.exports = { collectReturns, paramIdentifierName, bindingSignature, bindParamFromTaint }


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

function paramIdentifierName(param) {
  if (param.type === 'Identifier') return param.name
  if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') return param.left.name
  return null
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
