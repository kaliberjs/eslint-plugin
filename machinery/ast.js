module.exports = {
  getPropertyName, getStaticPropertyName,
  getFunctionName, getFunctionNodeName,
  getJSXElementName, getParentJSXElement,
  isRootJSXElement, hasParentsJSXElementsWithClassName, isInJSXBranch, isInExport,
  isAnonymousFunction,
  isFunctionNode, isPascalCase,
  isInsideComponent, isArrowConciseBody, isUseStateCall,
  getCalleeName,
}

function getPropertyName(property) {
  switch (property.type) {
    case 'Identifier': return property.name
    case 'Literal': return property.value
    case 'BinaryExpression': return getPropertyName(property.left)
    case 'ConditionalExpression': return getPropertyName(property.consequent)
    case 'MemberExpression': return getPropertyName(property.property)
    case 'TemplateLiteral': {
      const [name] = property.quasis
      return name.value.raw
    }
    default: return null
  }
}

/**
 * An ObjectExpression Property's key name, gated on `computed`: a computed
 * Identifier key (`{ [x]: v }`) is a variable reference, not a name, so only
 * a computed Literal key is trusted there. A non-computed key goes through
 * getPropertyName as usual — this is what an options-object matcher wants
 * (`{ secret: v }` and `{ 'secret': v }` are the same key), where
 * getPropertyName alone is not enough because it has no way to know
 * `property` came from a computed position.
 */
function getStaticPropertyName(property) {
  if (!property.computed) return getPropertyName(property.key)
  return property.key?.type === 'Literal' ? property.key.value : undefined
}

function getFunctionName(sourceCode, node) {
  return getName(getRootFunctionScope(sourceCode.getScope(node)))

  function getName({ block: { id } }) {
    return id ? id.name : '???'
  }
}

function isInExport(sourceCode, node) {
  const { type } = getRootFunctionScope(sourceCode.getScope(node)).block.parent
  return ['ExportDefaultDeclaration', 'ExportNamedDeclaration'].includes(type)
}

function getRootFunctionScope(node, previous = []) {
  const { upper } = node
  const [lastSeen] = previous
  if (upper.type === 'module') {
    if (node.type === 'function') return node
    if (lastSeen) return lastSeen
    throw new Error('Could not find root function name')
  }
  return getRootFunctionScope(upper, [...(node.type === 'function' ? [node] : []), ...previous])
}

function getJSXElementName(jsxElement) {
  const { name } = jsxElement.openingElement
  switch (name.type) {
    case 'JSXIdentifier': return name.name
    case 'JSXMemberExpression': return name.property.name
    default: throw new Error(`Can not determine name for '${name.type}'`)
  }
}

function isRootJSXElement(jsxElement) {
  return !getParentJSXElement(jsxElement)
}

function hasParentsJSXElementsWithClassName(jsxElement) {
  return getParentJSXElements(jsxElement).some(hasClassName)

  function hasClassName(jsxElement) {
    return jsxElement.openingElement.attributes
      .some(x => x.type === 'JSXAttribute' && x.name.name === 'className')
  }
}

function isInJSXBranch(jsxElement) {
  return isInJSXFragment(jsxElement) || getParentJSXElements(jsxElement).some(hasBranchingChildren)

  function hasBranchingChildren(jsxElement) {
    const branchCandidate = ['JSXElement', 'JSXExpressionContainer']
    const [first, ...rest] = jsxElement.children.filter(x => branchCandidate.includes(x.type))
    return rest.length > 0 || !first || first.type === 'JSXExpressionContainer'
  }
}

function getParentJSXElements(jsxElement) {
  const parent = getParentJSXElement(jsxElement)
  if (!parent) return []
  return [parent, ...getParentJSXElements(parent)]
}

function getParentJSXElement({ parent }) {
  if (!parent) return
  return parent.type === 'JSXElement'
    ? parent
    : getParentJSXElement(parent)
}

function isInJSXFragment({ parent }) {
  if (!parent) return false
  return parent.type === 'JSXFragment' || isInJSXFragment(parent)
}

function isAnonymousFunction(node) {
  return (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && !node.id
}

function isFunctionNode(node) {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
  ].includes(node.type)
}

function getFunctionNodeName(node) {
  if (node.id) return node.id.name

  const { parent } = node
  if (
    parent &&
    parent.type === 'VariableDeclarator' &&
    parent.id.type === 'Identifier'
  ) return parent.id.name

  return null
}

function isPascalCase(name) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name)
}

/**
 * Walk up the AST to determine if this node is inside a function that
 * looks like a React component (PascalCase name, or arrow assigned to PascalCase).
 */
function isInsideComponent(node) {
  let current = node.parent

  while (current) {
    if (isFunctionNode(current)) {
      const name = getFunctionNodeName(current)
      if (name && isPascalCase(name)) return true
    }

    current = current.parent
  }

  return false
}

function isArrowConciseBody(arrowFn, bodyNode) {
  return arrowFn.type === 'ArrowFunctionExpression' && arrowFn.body === bodyNode
}

function isUseStateCall(node) {
  if (!node || node.type !== 'CallExpression') return false
  const { callee } = node

  if (callee.type === 'Identifier' && callee.name === 'useState') return true

  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' && callee.object.name === 'React' &&
    callee.property.type === 'Identifier' && callee.property.name === 'useState'
  ) return true

  return false
}

/**
 * The name a call is made under: the identifier for a bare call, the property
 * for a member call. Deliberately receiver-blind — `crypto.createHash(…)` and
 * `createHash(…)` answer the same, which is what a factory-name matcher wants
 * when the module could have been destructured, aliased or namespaced.
 *
 * Accepts a callee or the CallExpression itself.
 */
function getCalleeName(node) {
  const callee = node?.callee ?? node
  if (callee?.type === 'Identifier') return callee.name
  if (callee?.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}
