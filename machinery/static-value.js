const { getPropertyName, isFunctionNode } = require('./ast')

module.exports = { staticValue }

const maxDepth = 30

/** @type {Folded} */
const unresolvable = Object.freeze({ unresolved: true })

/**
 * Folds an expression to the value it has when the file is loaded, through ESLint's scope
 * analysis: literals, object literals, templates, `+`, `===`, `!==`, `&&`, `||`, conditionals,
 * `const` bindings, `process.env.X` as unset, and same-file helpers whose body is one
 * returned expression, called with their arguments bound to their parameters. Returns `{ value }`,
 * or `{ unresolved: true }` for anything else.
 *
 * @example
 * // function hasAuth() { return `auth != null` }
 * staticValue(parse('`${hasAuth()} && newData.exists()`'), sourceCode)
 * // => { value: 'auth != null && newData.exists()' }
 *
 * @param {Node} node
 * @param {SourceCode} sourceCode
 */
function staticValue(node, sourceCode) {
  return resolve(node, { sourceCode, bindings: new Map(), depth: 0 })
}

/**
 * @param {Node} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function resolve(node, folding) {
  if (folding.depth > maxDepth) return unresolvable

  const deeper = { ...folding, depth: folding.depth + 1 }

  switch (node.type) {
    case 'Literal': return { value: node.value }
    case 'TemplateLiteral': return template(node, deeper)
    case 'BinaryExpression': return binary(node, deeper)
    case 'LogicalExpression': return logical(node, deeper)
    case 'ConditionalExpression': return conditional(node, deeper)
    case 'Identifier': return identifier(node, deeper)
    case 'MemberExpression': return member(node)
    case 'CallExpression': return call(node, deeper)
    case 'ObjectExpression': return object(node, deeper)
    default: return unresolvable
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
    if (property.type !== 'Property') return unresolvable

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

/**
 * @param {import('estree').BinaryExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function binary(node, folding) {
  if (node.left.type === 'PrivateIdentifier') return unresolvable

  const left = resolve(node.left, folding)
  const right = resolve(node.right, folding)

  if (left.unresolved) return left
  if (right.unresolved) return right

  switch (node.operator) {
    case '+': return { value: /** @type {any} */ (left.value) + right.value }
    case '===': return { value: left.value === right.value }
    case '!==': return { value: left.value !== right.value }
    default: return unresolvable
  }
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
 * `process.env.X` folds as unset, so a `CONFIG_ENV === 'dev'` branch folds to production; any
 * other member access is unresolved.
 *
 * @param {import('estree').MemberExpression} node
 * @returns {Folded}
 */
function member(node) {
  return isProcessEnv(node.object) && !node.computed ? { value: undefined } : unresolvable
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
  const isConstant = definition?.type === 'Variable' && definition.parent.kind === 'const' &&
    definition.node.id.type === 'Identifier'
  const init = isConstant ? definition.node.init : null

  return init ? resolve(init, folding) : unresolvable
}

/**
 * @param {import('estree').CallExpression} node
 * @param {Folding} folding
 * @returns {Folded}
 */
function call(node, folding) {
  if (node.callee.type !== 'Identifier') return unresolvable

  const definition = variableOf(node.callee, folding.sourceCode)?.defs[0]
  const helper = definition && functionOf(definition)
  const returnedExpression = helper && returnedOf(helper)

  if (!helper || !returnedExpression) return unresolvable

  const helperScope = folding.sourceCode.getScope(helper)
  const bindings = new Map(folding.bindings)

  for (const [i, parameter] of helper.params.entries()) {
    if (parameter.type !== 'Identifier') return unresolvable

    const argument = node.arguments[i]
    const argumentValue = argument ? resolve(argument, folding) : { value: undefined }

    bindings.set(helperScope.set.get(parameter.name) ?? null, argumentValue)
  }

  return resolve(returnedExpression, { ...folding, bindings })
}

/**
 * The variable `node` refers to, as ESLint's scope analysis resolved it.
 *
 * @param {import('estree').Identifier} node
 * @param {SourceCode} sourceCode
 */
function variableOf(node, sourceCode) {
  const { references } = sourceCode.getScope(node)

  return references.find(reference => reference.identifier === node)?.resolved ?? null
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
/** @typedef {{ value?: unknown, unresolved?: boolean }} Folded */
/** @typedef {Map<Variable | null, Folded>} Bindings */
/**
 * What folding carries down: the parameter values of the helpers being folded, and its depth.
 *
 * @typedef {{ sourceCode: SourceCode, bindings: Bindings, depth: number }} Folding
 */
