module.exports = {
  getPropertyName,
  getJSXElementName,
  getParentJSXElement,
  isRootJSXElement,
  hasParentsJSXElementsWithClassName,
  isInJSXBranch,
  getParentJSXElements,
  isInJSXFragment,
  getEnclosingFunctionNode,
  getFunctionName,
  isInExport
}

function getPropertyName(property) {
  if (!property) return '???'
  switch (property.type) {
    case 'Identifier': return property.name
    case 'Literal': return property.value
    case 'BinaryExpression': return getPropertyName(property.left)
    case 'TemplateLiteral':
      const [name] = property.quasis
      return name.value.raw
    default:
      // DO NOT THROW - This can panic linters like Oxlint
      return '???'
  }
}

function getJSXElementName(jsxElement) { // Safety check
  const { name } = jsxElement.openingElement
  switch (name.type) {
    case 'JSXIdentifier': return name.name
    case 'JSXMemberExpression': return name.property.name
    default: return '???'
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
  else return [parent, ...getParentJSXElements(parent)]
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

function getEnclosingFunctionNode(node) {
  let current = node
  let rootFunction = null

  while (current && current.parent) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      // Keep updating to find the *highest* (outer-most) function
      rootFunction = current
    }

    current = current.parent

    // Stop if we hit the top of the file
    if (!current || current.type === 'Program') break
  }

  return rootFunction
}

function getESLintScope(context) {
  try {
    const rootScope = getESLintRootFunctionScope(context.getScope())
    const id = rootScope.block.id
    return id ? id.name : '???'
  } catch (e) {
    return '???' 
  }
}

function getFunctionName(contextOrNode) {
  // Check if we got the ESLint 'context' object by sniffing for .getScope()
  if (typeof contextOrNode.getScope === 'function') getESLintScope(contextOrNode)

  // --- NEW OXLINT/NODE LOGIC ---
  const functionNode = contextOrNode
  if (!functionNode) return '???'

  // Case 1: function MyComponent() {}
  if (functionNode.id && functionNode.id.type === 'Identifier') {
    return functionNode.id.name
  }

  // Case 2: const MyComponent = () => {}
  // Case 3: const MyComponent = function() {}
  if (
    (functionNode.type === 'ArrowFunctionExpression' || functionNode.type === 'FunctionExpression') &&
    functionNode.parent &&
    functionNode.parent.type === 'VariableDeclarator' &&
    functionNode.parent.id.type === 'Identifier'
  ) {
    return functionNode.parent.id.name
  }

  return '???'
}

function getESLintExportType(context) {  
    try {
      const { type } = getRootFunctionScope_Old(context.getScope()).block.parent
      return ['ExportDefaultDeclaration', 'ExportNamedDeclaration'].includes(type)
    } catch (e) {
      return false 
    }
}

function isInExport(contextOrNode) {
  // Check if we got the ESLint 'context' object by sniffing for .getScope()
  if (typeof contextOrNode.getScope === 'function') getESLintExportType(contextOrNode)

  const functionNode = contextOrNode
  if (!functionNode) return false
  let current = functionNode

  while (current && current.parent) {
    if (current.type === 'Program') return false

    const { parent } = current
    if (!parent) return false // Safety check

    // Case 1: Direct export
    // export default function ...
    // export function ...
    // export default () => ...
    if (
      (parent.type === 'ExportDefaultDeclaration' || parent.type === 'ExportNamedDeclaration') &&
      parent.declaration === current
    ) {
      return true
    }

    // Case 2: Exported variable declaration
    // export const MyComponent = () => ...
    if (
      current.type === 'VariableDeclarator' &&
      parent.type === 'VariableDeclaration' &&
      parent.parent &&
      parent.parent.type === 'ExportNamedDeclaration' &&
      parent.parent.declaration === parent
    ) {
      return true
    }

    // If we traverse past a statement boundary, it's not a direct export
    if (current.type.endsWith('Statement') && current !== functionNode) {
      return false
    }

    current = parent
  }

  return false
}

function getESLintRootFunctionScope(node, previous = []) {
  const { upper } = node
  const [lastSeen] = previous

  if (upper.type === 'module') {
    if (node.type === 'function') return node
    else if (lastSeen) return lastSeen
    else throw new Error('Could not find root function name')
  } else {
    return getESLintRootFunctionScope(upper, [...(node.type === 'function' ? [node] : []), ...previous])
  }
}
