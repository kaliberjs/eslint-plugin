const { getPropertyName, isFunctionNode } = require('./ast')

module.exports = { staticValue }

const maxDepth = 30

/**
 * Folds an expression to the value it has when the file is loaded, through ESLint's scope
 * analysis: literals, object literals, templates, `+`, `===`, `!==`, `&&`, `||`, conditionals,
 * `const` bindings, `process.env.X` read from `env`, and same-file helpers whose body is one
 * returned expression, called with their arguments bound to their parameters. Returns `{ value }`,
 * or `{ unresolved }` with the reason folding stopped.
 *
 * @example
 * // function hasAuth() { return `auth != null` }
 * staticValue(parse('`${hasAuth()} && newData.exists()`'), sourceCode)
 * // => { value: 'auth != null && newData.exists()' }
 *
 * @param {Node} node
 * @param {SourceCode} sourceCode
 * @param {Env} [env] - values for `process.env.X`; an unset key folds to `undefined`
 */
function staticValue(node, sourceCode, env = {}) {
  return resolve(node, { sourceCode, env, bindings: new Map(), depth: 0 })
}

/**
 * @param {Node} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function resolve(node, folding) {
  if (folding.depth > maxDepth) return { unresolved: 'other' }

  const deeper = { ...folding, depth: folding.depth + 1 }

  switch (node.type) {
    case 'Literal': return { value: node.value }
    case 'TemplateLiteral': return template(node, deeper)
    case 'BinaryExpression': return binary(node, deeper)
    case 'LogicalExpression': return logical(node, deeper)
    case 'ConditionalExpression': return conditional(node, deeper)
    case 'Identifier': return identifier(node, deeper)
    case 'MemberExpression': return member(node, folding.env)
    case 'CallExpression': return call(node, deeper)
    case 'ObjectExpression': return object(node, deeper)
    default: return { unresolved: 'other' }
  }
}

/**
 * @param {import('estree').ObjectExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function object(node, folding) {
  /** @type {Record<string, unknown>} */
  const result = {}

  for (const property of node.properties) {
    if (property.type !== 'Property') return { unresolved: 'other' }

    /** @type {Folded} */
    const key = property.computed
      ? resolve(property.key, folding)
      : { value: getPropertyName(property.key) }
    const value = resolve(property.value, folding)

    if (key.unresolved) return key
    if (value.unresolved) return value
    result[String(key.value)] = value.value
  }

  return { value: result }
}

/**
 * @param {import('estree').TemplateLiteral} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function template(node, folding) {
  let text = node.quasis[0].value.cooked

  for (const [i, expression] of node.expressions.entries()) {
    const part = resolve(expression, folding)

    if (part.unresolved) return part
    text += String(part.value) + node.quasis[i + 1].value.cooked
  }

  return { value: text }
}

/** @type {Record<string, (a: any, b: any) => unknown>} */
const operators = { '+': add, '===': isSame, '!==': isDifferent }

/**
 * @param {import('estree').BinaryExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function binary(node, folding) {
  if (node.left.type === 'PrivateIdentifier') return { unresolved: 'other' }

  const left = resolve(node.left, folding)
  const right = resolve(node.right, folding)
  const operator = operators[node.operator]

  if (left.unresolved) return left
  if (right.unresolved) return right
  if (!operator) return { unresolved: 'other' }

  return { value: operator(left.value, right.value) }
}

/**
 * @param {any} a
 * @param {any} b
 */
function add(a, b) {
  return a + b
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function isSame(a, b) {
  return a === b
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function isDifferent(a, b) {
  return a !== b
}

/**
 * @param {import('estree').LogicalExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function logical(node, folding) {
  const left = resolve(node.left, folding)

  if (left.unresolved) return left
  if (node.operator === '&&' && !left.value) return left
  if (node.operator === '||' && left.value) return left

  return resolve(node.right, folding)
}

/**
 * @param {import('estree').ConditionalExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function conditional(node, folding) {
  const test = resolve(node.test, folding)

  if (test.unresolved) return test

  return resolve(test.value ? node.consequent : node.alternate, folding)
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

  if (!isProcessEnv(object) || node.computed || property.type !== 'Identifier') {
    return { unresolved: 'member' }
  }

  return { value: env[property.name] }
}

/** @param {Node} node */
function isProcessEnv(node) {
  return node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' && node.object.name === 'process' &&
    node.property.type === 'Identifier' && node.property.name === 'env'
}

/**
 * @param {import('estree').Identifier} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function identifier(node, folding) {
  if (node.name === 'undefined') return { value: undefined }

  const variable = variableOf(node, folding.sourceCode)
  const bound = folding.bindings.get(variable)

  if (bound) return bound

  const definition = variable?.defs[0]

  if (!definition) return { unresolved: 'other' }
  if (definition.type === 'Parameter') return { unresolved: 'option' }
  if (definition.type === 'ImportBinding') return { unresolved: 'import' }
  if (definition.type !== 'Variable') return { unresolved: 'other' }

  const { id, init } = definition.node

  if (id.type !== 'Identifier') {
    return { unresolved: isImported(init, folding.sourceCode) ? 'import' : 'other' }
  }
  if (!init) return { unresolved: 'other' }
  if (isRequire(init)) return { unresolved: 'import' }

  return resolve(init, folding)
}

/**
 * @param {import('estree').CallExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function call(node, folding) {
  if (node.callee.type !== 'Identifier') return { unresolved: 'member call' }

  const definition = variableOf(node.callee, folding.sourceCode)?.defs[0]

  if (!definition) return { unresolved: 'other' }
  if (definition.type === 'Parameter') return { unresolved: 'option' }
  if (isImportedFunction(definition, folding.sourceCode)) return { unresolved: 'import' }

  const helper = functionOf(definition)
  const returnedExpression = helper && returnedOf(helper)

  if (!helper || !returnedExpression) return { unresolved: 'other' }

  const helperScope = folding.sourceCode.getScope(helper)
  const bindings = new Map(folding.bindings)

  for (const [i, parameter] of helper.params.entries()) {
    if (parameter.type !== 'Identifier') return { unresolved: 'other' }

    const argument = node.arguments[i]
    const argumentValue = argument ? resolve(argument, folding) : { value: undefined }

    bindings.set(helperScope.set.get(parameter.name) ?? null, argumentValue)
  }

  return resolve(returnedExpression, { ...folding, bindings })
}

/**
 * The variable `node` refers to, from the innermost scope out.
 *
 * @param {import('estree').Identifier} node
 * @param {SourceCode} sourceCode
 */
function variableOf(node, sourceCode) {
  /** @type {import('eslint').Scope.Scope | null} */
  let scope = sourceCode.getScope(node)

  while (scope) {
    const variable = scope.set.get(node.name)

    if (variable) return variable
    scope = scope.upper
  }

  return null
}

/**
 * `require(…)`, or a binding whose own initializer is one.
 *
 * @param {Node | null | undefined} node
 * @param {SourceCode} sourceCode
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
 */
function isRequire(node) {
  const call = node?.type === 'MemberExpression' ? node.object : node

  return call?.type === 'CallExpression' &&
    call.callee.type === 'Identifier' && call.callee.name === 'require'
}

/**
 * @param {Definition} definition
 * @param {SourceCode} sourceCode
 */
function isImportedFunction(definition, sourceCode) {
  if (definition.type === 'ImportBinding') return true
  if (definition.type !== 'Variable') return false

  const { id, init } = definition.node

  return isRequire(init) || (id.type === 'ObjectPattern' && isImported(init, sourceCode))
}

/**
 * The function a declaration or `const` defines.
 *
 * @param {Definition} definition
 */
function functionOf(definition) {
  const declared =
    definition.type === 'FunctionName' ? definition.node :
    definition.type === 'Variable' ? definition.node.init :
    null

  return declared && isFunctionNode(declared) ? declared : null
}

/**
 * The expression a function returns, when its body is that one expression.
 *
 * @param {import('estree').Function} fn
 */
function returnedOf(fn) {
  if (fn.body.type !== 'BlockStatement') return fn.body

  const [statement, ...rest] = fn.body.body

  return statement?.type === 'ReturnStatement' && !rest.length ? statement.argument : null
}

/** @typedef {import('estree').Node} Node */
/** @typedef {import('eslint').SourceCode} SourceCode */
/** @typedef {import('eslint').Scope.Variable} Variable */
/** @typedef {import('eslint').Scope.Definition} Definition */
/** @typedef {Record<string, string | undefined>} Env */
/** @typedef {'option' | 'import' | 'member' | 'member call' | 'other'} Reason */
/** @typedef {{ value?: unknown, unresolved?: Reason }} Folded */
/** @typedef {Map<Variable | null, Folded>} Bindings */
/**
 * What folding carries down: the parameter values of the helpers being folded, and its depth.
 *
 * @typedef {{ sourceCode: SourceCode, env: Env, bindings: Bindings, depth: number }} Folding
 */
