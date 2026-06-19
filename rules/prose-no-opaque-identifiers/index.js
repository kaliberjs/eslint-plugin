const docsUrl = require('../../machinery/docsUrl')
const { getVariableName } = require('../../machinery/prose/ast')

const defaultAllowedNames = ['_', 'id', 'db', 'fs', 'cx', 'to', 'by', 'on', 'el']
const defaultBannedNames = [
  'arr',
  'obj',
  'cfg',
  'tmp',
  'val',
  'num',
  'str',
  'bool',
  'foo',
  'bar',
  'baz',
  'qux',
  'stuff',
  'thing',
]

const messages = {
  opaqueIdentifier:
    "Rename '{{name}}' to describe the value's role in the domain.",
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow short and generic identifiers that hide intent',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minLength: {
            type: 'integer',
            minimum: 1,
          },
          allowedNames: {
            type: 'array',
            items: { type: 'string' },
          },
          bannedNames: {
            type: 'array',
            items: { type: 'string' },
          },
          allowLoopIndexes: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const minLength = options.minLength || 2
    const allowedNames = new Set([
      ...defaultAllowedNames,
      ...(options.allowedNames || []),
    ])
    const bannedNames = new Set([
      ...defaultBannedNames,
      ...(options.bannedNames || []),
    ])
    const allowLoopIndexes = options.allowLoopIndexes !== false

    return {
      VariableDeclarator(node) {
        reportOpaqueNames(node.id)
      },
      FunctionDeclaration(node) {
        node.params.forEach(reportOpaqueNames)
      },
      FunctionExpression(node) {
        node.params.forEach(reportOpaqueNames)
      },
      ArrowFunctionExpression(node) {
        node.params.forEach(reportOpaqueNames)
      },
      CatchClause(node) {
        reportOpaqueNames(node.param)
      },
    }

    function reportOpaqueNames(pattern) {
      for (const identifier of getDeclaredIdentifiers(pattern)) {
        const name = getVariableName(identifier)
        if (!name) continue
        if (isAllowedName(name, identifier)) continue
        if (!isOpaqueName(name)) continue

        context.report({
          node: identifier,
          messageId: 'opaqueIdentifier',
          data: { name },
        })
      }
    }

    function isAllowedName(name, identifier) {
      if (allowedNames.has(name)) return true
      return allowLoopIndexes && isLoopIndex(name, identifier)
    }

    function isOpaqueName(name) {
      return name.length < minLength || bannedNames.has(name)
    }
  },
}

function getDeclaredIdentifiers(pattern) {
  if (!pattern) return []

  switch (pattern.type) {
    case 'Identifier':
      return [pattern]
    case 'RestElement':
      return getDeclaredIdentifiers(pattern.argument)
    case 'AssignmentPattern':
      return getDeclaredIdentifiers(pattern.left)
    case 'ArrayPattern':
      return pattern.elements.flatMap(getDeclaredIdentifiers)
    case 'ObjectPattern':
      return pattern.properties.flatMap(property => {
        if (property.type === 'RestElement') return getDeclaredIdentifiers(property.argument)
        return getDeclaredIdentifiers(property.value)
      })
    default:
      return []
  }
}

function isLoopIndex(name, identifier) {
  if (!['i', 'j', 'k'].includes(name)) return false

  const variableDeclarator = identifier.parent
  const variableDeclaration = variableDeclarator && variableDeclarator.parent
  const forStatement = variableDeclaration && variableDeclaration.parent

  return Boolean(
    variableDeclarator &&
    variableDeclarator.type === 'VariableDeclarator' &&
    variableDeclarator.id === identifier &&
    variableDeclaration &&
    variableDeclaration.type === 'VariableDeclaration' &&
    forStatement &&
    forStatement.type === 'ForStatement' &&
    forStatement.init === variableDeclaration
  )
}
