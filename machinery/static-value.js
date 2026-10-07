const { isFunctionNode } = require('./ast')

module.exports = { staticValue }

const maxDepth = 30

/**
 * Folds an expression to the value it has when the file is loaded, through
 * ESLint's scope analysis: literals, object literals, templates, `+`, `===`, `!==`, `&&`, `||`,
 * conditionals, `const` bindings, `process.env.X` read from `env`, and
 * same-file helpers whose body is one returned expression, called with their
 * arguments bound to their parameters.
 *
 * Returns `{ value }`, or `{ unresolved }` with the reason it stopped:
 * `option` (a parameter), `import`, `member`, `member call` or `other`.
 */
function staticValue(node, sourceCode, env = {}) {
  return resolve(node, new Map(), sourceCode, env, 0)
}

function resolve(node, bindings, sourceCode, env, depth) {
  if (depth > maxDepth) return { unresolved: 'other' }

  const resolvers = {
    Literal: () => ({ value: node.value }),
    TemplateLiteral: () => template(node, bindings, sourceCode, env, depth),
    BinaryExpression: () => binary(node, bindings, sourceCode, env, depth),
    LogicalExpression: () => logical(node, bindings, sourceCode, env, depth),
    ConditionalExpression: () => conditional(node, bindings, sourceCode, env, depth),
    Identifier: () => identifier(node, bindings, sourceCode, env, depth),
    MemberExpression: () => member(node, env),
    CallExpression: () => call(node, bindings, sourceCode, env, depth),
    ObjectExpression: () => object(node, bindings, sourceCode, env, depth),
  }

  return resolvers[node.type]?.() ?? { unresolved: 'other' }
}

function object(node, bindings, sourceCode, env, depth) {
  const result = {}

  for (const property of node.properties) {
    if (property.type !== 'Property') return { unresolved: 'other' }

    const key = property.computed
      ? resolve(property.key, bindings, sourceCode, env, depth + 1)
      : { value: property.key.type === 'Identifier' ? property.key.name : property.key.value }
    const value = resolve(property.value, bindings, sourceCode, env, depth + 1)

    if (key.unresolved) return key
    if (value.unresolved) return value
    result[key.value] = value.value
  }

  return { value: result }
}

function template(node, bindings, sourceCode, env, depth) {
  let text = node.quasis[0].value.cooked

  for (const [i, expression] of node.expressions.entries()) {
    const part = resolve(expression, bindings, sourceCode, env, depth + 1)

    if (part.unresolved) return part
    text += String(part.value) + node.quasis[i + 1].value.cooked
  }

  return { value: text }
}

function binary(node, bindings, sourceCode, env, depth) {
  const left = resolve(node.left, bindings, sourceCode, env, depth + 1)
  const right = resolve(node.right, bindings, sourceCode, env, depth + 1)

  if (left.unresolved) return left
  if (right.unresolved) return right

  const operators = { '+': (a, b) => a + b, '===': (a, b) => a === b, '!==': (a, b) => a !== b }

  return node.operator in operators ? { value: operators[node.operator](left.value, right.value) } : { unresolved: 'other' }
}

function logical(node, bindings, sourceCode, env, depth) {
  const left = resolve(node.left, bindings, sourceCode, env, depth + 1)

  if (left.unresolved) return left
  if (node.operator === '&&' && !left.value) return left
  if (node.operator === '||' && left.value) return left

  return resolve(node.right, bindings, sourceCode, env, depth + 1)
}

function conditional(node, bindings, sourceCode, env, depth) {
  const test = resolve(node.test, bindings, sourceCode, env, depth + 1)

  if (test.unresolved) return test

  return resolve(test.value ? node.consequent : node.alternate, bindings, sourceCode, env, depth + 1)
}

function member(node, env) {
  const isEnv = node.object.type === 'MemberExpression' && node.object.object.name === 'process' && node.object.property.name === 'env'

  return isEnv ? { value: env[node.property.name] } : { unresolved: 'member' }
}

function variableOf(node, sourceCode) {
  for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
    const variable = scope.set.get(node.name)

    if (variable) return variable
  }

  return null
}

function identifier(node, bindings, sourceCode, env, depth) {
  if (node.name === 'undefined') return { value: undefined }

  const variable = variableOf(node, sourceCode)

  if (bindings.has(variable)) return bindings.get(variable)

  const definition = variable?.defs[0]

  if (!definition) return { unresolved: 'other' }
  if (definition.type === 'Parameter') return { unresolved: 'option' }
  if (definition.type === 'ImportBinding') return { unresolved: 'import' }
  if (definition.type !== 'Variable') return { unresolved: 'other' }

  const { node: declarator } = definition

  if (declarator.id.type !== 'Identifier') return { unresolved: isImported(declarator.init, sourceCode) ? 'import' : 'other' }
  if (!declarator.init) return { unresolved: 'other' }
  if (isRequire(declarator.init)) return { unresolved: 'import' }

  return resolve(declarator.init, bindings, sourceCode, env, depth + 1)
}

// `require(…)`, or a binding whose own initializer is one.
function isImported(node, sourceCode) {
  if (isRequire(node)) return true
  if (node?.type !== 'Identifier') return false

  const declarator = variableOf(node, sourceCode)?.defs[0]?.node

  return isRequire(declarator?.init)
}

function isRequire(node) {
  const call = node?.type === 'MemberExpression' ? node.object : node

  return call?.type === 'CallExpression' && call.callee.name === 'require'
}

function call(node, bindings, sourceCode, env, depth) {
  if (node.callee.type !== 'Identifier') return { unresolved: 'member call' }

  const variable = variableOf(node.callee, sourceCode)
  const definition = variable?.defs[0]

  if (!definition) return { unresolved: 'other' }
  if (definition.type === 'Parameter') return { unresolved: 'option' }
  if (isImportedFunction(definition, sourceCode)) return { unresolved: 'import' }

  const fn = definition.type === 'FunctionName' ? definition.node : definition.node?.init
  const returned = fn && returnedOf(fn)

  if (!returned) return { unresolved: 'other' }

  const scope = sourceCode.getScope(fn)
  const bound = new Map(bindings)

  for (const [i, parameter] of fn.params.entries()) {
    if (parameter.type !== 'Identifier') return { unresolved: 'other' }

    const argument = node.arguments[i]

    bound.set(scope.set.get(parameter.name), argument ? resolve(argument, bindings, sourceCode, env, depth + 1) : { value: undefined })
  }

  return resolve(returned, bound, sourceCode, env, depth + 1)
}

function isImportedFunction(definition, sourceCode) {
  const declarator = definition.node

  return definition.type === 'ImportBinding' ||
    isRequire(declarator?.init) ||
    (declarator?.id?.type === 'ObjectPattern' && isImported(declarator.init, sourceCode))
}

function returnedOf(fn) {
  if (!isFunctionNode(fn)) return null
  if (fn.body.type !== 'BlockStatement') return fn.body

  const [statement, ...rest] = fn.body.body

  return statement?.type === 'ReturnStatement' && !rest.length ? statement.argument : null
}
