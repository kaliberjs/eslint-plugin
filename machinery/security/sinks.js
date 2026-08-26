const { getPropertyName } = require('@eslint-community/eslint-utils')
const { isGlobalNamed } = require('./expression')
const { matchesModuleSink, matchesPattern, matchesReceiver } = require('./registry-pattern')

/**
 * Does this call match a registry `sinks` entry, and if so which argument
 * carries the dangerous value?
 *
 * A sink is where untrusted data becomes a vulnerability — a SQL string, a
 * shell command, an HTML assignment. See registry.js#sinks.
 */
module.exports = { sinkAt }

function sinkAt(known, sourceCode, node) {
  if (node.type !== 'CallExpression' && node.type !== 'MemberExpression') return null

  // Property-target sinks: `el.innerHTML = x`. Matched on the member
  // expression, but only in assignment-target position — *reading*
  // el.innerHTML is harmless and must not match.
  if (node.type === 'MemberExpression') {
    if (node.parent?.type !== 'AssignmentExpression' || node.parent.left !== node) return null

    const name = getPropertyName(node, sourceCode.getScope(node))
    if (name === null) return null

    // An optional receiver constraint keeps property sinks from matching
    // every object with that property name (location.href vs link.href).
    return known.sinks.find(sink =>
      matchesPattern(sink.root.property, String(name)) &&
      (!sink.root.receiver || matchesReceiver(sourceCode, node.object, sink.root.receiver))
    ) ?? null
  }

  // Global-rooted sinks bind to a bare call of a platform global, never
  // imported: `fetch(url)`. isGlobalNamed is the same shadowing check
  // sources use for `location`/`document` — a local `fetch` (test double,
  // wrapper) must not match.
  if (node.callee.type === 'Identifier')
    return known.sinks.find(sink =>
      (sink.root.module && matchesModuleSink(sourceCode, node.callee, sink.root)) ||
      (sink.root.global && isGlobalNamed(sourceCode, node.callee, sink.root.global))
    ) ?? null

  // Method-rooted sinks require a receiver. A bare `query(sql)` or
  // `exec(cmd)` is far more likely to be something else entirely, and a
  // database handle is essentially always a receiver in real code.
  if (node.callee.type !== 'MemberExpression') return null

  const name = getPropertyName(node.callee, sourceCode.getScope(node.callee))
  if (name === null) return null

  return known.sinks.find(sink =>
    matchesPattern(sink.root.method, String(name)) &&
    (!sink.root.receiver || matchesReceiver(sourceCode, node.callee.object, sink.root.receiver))
  ) ?? null
}
