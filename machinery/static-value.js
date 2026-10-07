const { isFunctionNode } = require('./ast')

module.exports = { staticValue }

const maxDepth = 30

/**
 * Folds an expression to the value it has when the file is loaded, through
 * ESLint's scope analysis: literals, object literals, templates, `+`, `===`,
 * `!==`, `&&`, `||`, conditionals, `const` bindings, `process.env.X` read from
 * `env`, and same-file helpers whose body is one returned expression, called
 * with their arguments bound to their parameters.
 *
 * @example
 * // const hasAuth = () => `auth != null`
 * staticValue(parse('`${hasAuth()} && newData.exists()`'), sourceCode)
 * // => { value: 'auth != null && newData.exists()' }
 *
 * @param {Node} node
 * @param {SourceCode} sourceCode
 * @param {Env} [env] - values for `process.env.X`; an unset key folds to `undefined`
 * @returns {Folded} `{ value }`, or `{ unresolved }` with the reason folding stopped
 */
function staticValue(node, sourceCode, env = {}) {
  return resolve(node, new Map(), sourceCode, env, 0)
}

/**
 * @param {Node} node
 * @param {Bindings} bindings - parameter values of the helper calls being folded
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function resolve(node, bindings, sourceCode, env, depth) {
  if (depth > maxDepth) return { unresolved: 'other' }

  switch (node.type) {
    case 'Literal': return { value: node.value }
    case 'TemplateLiteral': return template(node, bindings, sourceCode, env, depth)
    case 'BinaryExpression': return binary(node, bindings, sourceCode, env, depth)
    case 'LogicalExpression': return logical(node, bindings, sourceCode, env, depth)
    case 'ConditionalExpression': return conditional(node, bindings, sourceCode, env, depth)
    case 'Identifier': return identifier(node, bindings, sourceCode, env, depth)
    case 'MemberExpression': return member(node, env)
    case 'CallExpression': return call(node, bindings, sourceCode, env, depth)
    case 'ObjectExpression': return object(node, bindings, sourceCode, env, depth)
    default: return { unresolved: 'other' }
  }
}

/**
 * @param {import('estree').ObjectExpression} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function object(node, bindings, sourceCode, env, depth) {
  /** @type {Record<string, unknown>} */
  const result = {}

  for (const property of node.properties) {
    if (property.type !== 'Property') return { unresolved: 'other' }

    const key = property.computed
      ? resolve(property.key, bindings, sourceCode, env, depth + 1)
      : { value: nameOf(property.key) }
    const value = resolve(property.value, bindings, sourceCode, env, depth + 1)

    if (key.unresolved) return key
    if (value.unresolved) return value
    result[String(key.value)] = value.value
  }

  return { value: result }
}

/**
 * @param {import('estree').Expression | import('estree').PrivateIdentifier} key - a non-computed property key
 * @returns {unknown} the identifier's name or the literal's value
 */
function nameOf(key) {
  if (key.type === 'Identifier') return key.name
  if (key.type === 'Literal') return key.value

  return undefined
}

/**
 * @param {import('estree').TemplateLiteral} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function template(node, bindings, sourceCode, env, depth) {
  let text = node.quasis[0].value.cooked

  for (const [i, expression] of node.expressions.entries()) {
    const part = resolve(expression, bindings, sourceCode, env, depth + 1)

    if (part.unresolved) return part
    text += String(part.value) + node.quasis[i + 1].value.cooked
  }

  return { value: text }
}

/**
 * @param {import('estree').BinaryExpression} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function binary(node, bindings, sourceCode, env, depth) {
  if (node.left.type === 'PrivateIdentifier') return { unresolved: 'other' }

  const left = resolve(node.left, bindings, sourceCode, env, depth + 1)
  const right = resolve(node.right, bindings, sourceCode, env, depth + 1)

  if (left.unresolved) return left
  if (right.unresolved) return right

  /** @type {Record<string, (a: any, b: any) => unknown>} */
  const operators = { '+': (a, b) => a + b, '===': (a, b) => a === b, '!==': (a, b) => a !== b }

  return node.operator in operators ? { value: operators[node.operator](left.value, right.value) } : { unresolved: 'other' }
}

/**
 * @param {import('estree').LogicalExpression} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function logical(node, bindings, sourceCode, env, depth) {
  const left = resolve(node.left, bindings, sourceCode, env, depth + 1)

  if (left.unresolved) return left
  if (node.operator === '&&' && !left.value) return left
  if (node.operator === '||' && left.value) return left

  return resolve(node.right, bindings, sourceCode, env, depth + 1)
}

/**
 * @param {import('estree').ConditionalExpression} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function conditional(node, bindings, sourceCode, env, depth) {
  const test = resolve(node.test, bindings, sourceCode, env, depth + 1)

  if (test.unresolved) return test

  return resolve(test.value ? node.consequent : node.alternate, bindings, sourceCode, env, depth + 1)
}

/**
 * `process.env.X` folds to `env.X`; any other member access is unresolved.
 *
 * @param {import('estree').MemberExpression} node
 * @param {Env} env
 * @returns {Folded}
 */
function member(node, env) {
  const { object, property } = node

  if (!isProcessEnv(object) || node.computed || property.type !== 'Identifier') return { unresolved: 'member' }

  return { value: env[property.name] }
}

/**
 * @param {Node} node
 * @returns {boolean}
 */
function isProcessEnv(node) {
  return node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' && node.object.name === 'process' &&
    node.property.type === 'Identifier' && node.property.name === 'env'
}

/**
 * @param {import('estree').Identifier} node
 * @param {SourceCode} sourceCode
 * @returns {Variable | null} the variable `node` refers to, from the innermost scope out
 */
function variableOf(node, sourceCode) {
  /** @type {Scope | null} */
  let scope = sourceCode.getScope(node)

  while (scope) {
    const variable = scope.set.get(node.name)

    if (variable) return variable
    scope = scope.upper
  }

  return null
}

/**
 * @param {import('estree').Identifier} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function identifier(node, bindings, sourceCode, env, depth) {
  if (node.name === 'undefined') return { value: undefined }

  const variable = variableOf(node, sourceCode)
  const bound = bindings.get(variable)

  if (bound) return bound

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

/**
 * `require(…)`, or a binding whose own initializer is one.
 *
 * @param {Node | null | undefined} node
 * @param {SourceCode} sourceCode
 * @returns {boolean}
 */
function isImported(node, sourceCode) {
  if (isRequire(node)) return true
  if (node?.type !== 'Identifier') return false

  const definition = variableOf(node, sourceCode)?.defs[0]

  return definition?.type === 'Variable' && isRequire(definition.node.init)
}

/**
 * `require(…)` or `require(…).member`.
 *
 * @param {Node | null | undefined} node
 * @returns {boolean}
 */
function isRequire(node) {
  const call = node?.type === 'MemberExpression' ? node.object : node

  return call?.type === 'CallExpression' && call.callee.type === 'Identifier' && call.callee.name === 'require'
}

/**
 * @param {import('estree').CallExpression} node
 * @param {Bindings} bindings
 * @param {SourceCode} sourceCode
 * @param {Env} env
 * @param {number} depth
 * @returns {Folded}
 */
function call(node, bindings, sourceCode, env, depth) {
  if (node.callee.type !== 'Identifier') return { unresolved: 'member call' }

  const variable = variableOf(node.callee, sourceCode)
  const definition = variable?.defs[0]

  if (!definition) return { unresolved: 'other' }
  if (definition.type === 'Parameter') return { unresolved: 'option' }
  if (isImportedFunction(definition, sourceCode)) return { unresolved: 'import' }

  const helper = functionOf(definition)

  if (!helper) return { unresolved: 'other' }

  const returnedExpression = returnedOf(helper)

  if (!returnedExpression) return { unresolved: 'other' }

  const helperScope = sourceCode.getScope(helper)
  const argumentBindings = new Map(bindings)

  for (const [i, parameter] of helper.params.entries()) {
    if (parameter.type !== 'Identifier') return { unresolved: 'other' }

    const argument = node.arguments[i]
    const argumentValue = argument ? resolve(argument, bindings, sourceCode, env, depth + 1) : { value: undefined }

    argumentBindings.set(helperScope.set.get(parameter.name) ?? null, argumentValue)
  }

  return resolve(returnedExpression, argumentBindings, sourceCode, env, depth + 1)
}

/**
 * @param {import('eslint').Scope.Definition} definition
 * @returns {import('estree').Function | null} the function a declaration or `const` defines
 */
function functionOf(definition) {
  const declared =
    definition.type === 'FunctionName' ? definition.node :
    definition.type === 'Variable' ? definition.node.init :
    null

  return declared && isFunctionNode(declared) ? declared : null
}

/**
 * @param {import('eslint').Scope.Definition} definition
 * @param {SourceCode} sourceCode
 * @returns {boolean}
 */
function isImportedFunction(definition, sourceCode) {
  if (definition.type === 'ImportBinding') return true
  if (definition.type !== 'Variable') return false

  const declarator = definition.node

  return isRequire(declarator.init) || (declarator.id.type === 'ObjectPattern' && isImported(declarator.init, sourceCode))
}

/**
 * The expression a function returns, when its body is that one expression.
 *
 * @param {import('estree').Function} fn
 * @returns {import('estree').Expression | null | undefined}
 */
function returnedOf(fn) {
  if (fn.body.type !== 'BlockStatement') return fn.body

  const [statement, ...rest] = fn.body.body

  return statement?.type === 'ReturnStatement' && !rest.length ? statement.argument : null
}

/** @typedef {import('estree').Node} Node */
/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {import('eslint').Scope.Variable} Variable */
/** @typedef {import('eslint').Scope.Scope} Scope */
/** @typedef {Record<string, string | undefined>} Env */
/** @typedef {'option' | 'import' | 'member' | 'member call' | 'other'} Reason */
/** @typedef {{ value?: unknown, unresolved?: Reason }} Folded */
/** @typedef {Map<Variable | null, Folded>} Bindings */
