const { isGlobalNamed, isPrefix, memberChain, referenceFor, shortText } = require('./expression')
const { isFunctionNode } = require('../ast')

/**
 * Does this node read from a registry `sources` entry?
 *
 * A source is untrusted input at its point of entry — `req.query.id`,
 * `location.hash`, a named handler parameter. Whether something is a source
 * is a registry fact, never a guess: see registry.js#sources.
 */
module.exports = { sourceAt, sourceForIdentifier, sourceForMember, matchSourcePath, startTaint }

function sourceAt(known, sourceCode, node) {
  if (node.type === 'Identifier') return sourceForIdentifier(known, sourceCode, node)
  if (node.type === 'MemberExpression') return sourceForMember(known, sourceCode, node)
  return null
}

function sourceForIdentifier(known, sourceCode, node) {
  const global = known.sources.find(source => !source.path.length && isGlobalNamed(sourceCode, node, source.root.global))
  if (global) return global

  const variable = referenceFor(sourceCode, node)?.resolved
  const parameter = variable?.defs.find(definition => definition.type === 'Parameter')
  if (!parameter) return null

  return known.sources.find(source => !source.path.length && matchesParameter(source, variable, parameter)) ?? null
}

function sourceForMember(known, sourceCode, node) {
  const { root, path } = memberChain(sourceCode, node)
  if (!root || !path.length) return null

  return known.sources.find(source =>
    source.path.length &&
    isPrefix(source.path, path) &&
    matchesRoot(known, sourceCode, source, root)
  ) ?? null
}

function matchesRoot(known, sourceCode, source, root) {
  if (root.type !== 'Identifier') return false
  if (isGlobalNamed(sourceCode, root, source.root.global)) return true

  const variable = referenceFor(sourceCode, root)?.resolved
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

function matchSourcePath(known, sourceCode, root, path) {
  return known.sources.find(source => isPrefix(source.path, path) && matchesRoot(known, sourceCode, source, root)) ?? null
}

function startTaint(sourceCode, source, node) {
  return {
    source,
    sanitizedFor: new Set(),
    confidence: source.confidence,
    path: [{ node, kind: 'source', label: shortText(sourceCode, node), penalty: 0 }],
  }
}
