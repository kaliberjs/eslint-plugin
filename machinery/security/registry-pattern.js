const { getPropertyName } = require('@eslint-community/eslint-utils')
const { referenceFor } = require('./expression')

/**
 * The vocabulary registry entries are written in: how a declarative entry's
 * `root.global`, `root.module`, `receiver` and path shape are tested against
 * a real node. Shared by the source, sink, sanitizer and propagator matchers,
 * which is the only reason it is its own file.
 */
module.exports = { matchesModuleSink, requiredBy, matchesReceiver, matchesPattern, patternSegments }

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
function matchesModuleSink(sourceCode, identifier, root) {
  const variable = referenceFor(sourceCode, identifier)?.resolved
  const definition = variable?.defs[0]
  if (!definition) return false

  if (definition.type === 'ImportBinding') {
    if (!matchesPattern(root.module, definition.parent.source.value)) return false

    // A default import has no `imported` node, and falling back to the
    // *local* name meant `import fetch from 'node-fetch'` matched only by
    // the coincidence of what the developer called it — `import f from
    // 'node-fetch'` was invisible. The export's real name is `default`,
    // which is what registry entries already write in their `name`
    // pattern; supplying it here is what makes those entries true.
    if (definition.node.type === 'ImportDefaultSpecifier') return root.name.test('default')

    const imported = definition.node.imported
    const importedName = imported?.type === 'Identifier' ? imported.name : imported?.value
    return root.name.test(String(importedName ?? identifier.name))
  }

  if (definition.type !== 'Variable') return false

  const { module, name } = requiredBy(sourceCode, definition)
  return matchesPattern(root.module, module) && name !== null && root.name.test(name)
}

function requiredBy(sourceCode, definition) {
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
    const property = getPropertyName(init, sourceCode.getScope(init))
    return property === null ? {} : { module: requiredModule(base), name: String(property) }
  }

  // `const cp = require('child_process')` binds the whole module; its member
  // calls go through the MemberExpression path above and need no entry here.
  return {}
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
function matchesReceiver(sourceCode, object, pattern) {
  if (object.type === 'Identifier') return pattern.test(object.name)
  if (object.type === 'MemberExpression') {
    const name = getPropertyName(object, sourceCode.getScope(object))
    return name !== null && pattern.test(String(name))
  }
  return false
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
