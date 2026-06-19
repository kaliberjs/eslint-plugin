const docsUrl = require('../../machinery/docsUrl')
const { unwrapExpression } = require('../../machinery/prose/ast')

const defaultGenericNames = [
  'doStuff',
  'doThing',
  'filterAndMap',
  'handleStuff',
  'mapAndFilter',
  'processArray',
  'processData',
]

const defaultGenericVerbs = [
  'do',
  'execute',
  'filter',
  'get',
  'handle',
  'make',
  'manage',
  'map',
  'perform',
  'process',
  'run',
  'set',
  'transform',
  'update',
]

const defaultGenericNouns = [
  'array',
  'data',
  'input',
  'item',
  'items',
  'object',
  'output',
  'result',
  'results',
  'stuff',
  'thing',
  'things',
  'value',
  'values',
]

const messages = {
  genericFunctionName:
    "Rename '{{name}}' to describe the domain outcome, not the implementation technique.",
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow implementation-detail and generic function names',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          genericNames: {
            type: 'array',
            items: { type: 'string' },
          },
          genericVerbs: {
            type: 'array',
            items: { type: 'string' },
          },
          genericNouns: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages,
  },

  create(context) {
    const options = context.options[0] || {}
    const genericNames = new Set([
      ...defaultGenericNames,
      ...(options.genericNames || []),
    ])
    const genericVerbs = new Set([
      ...defaultGenericVerbs,
      ...(options.genericVerbs || []),
    ])
    const genericNouns = new Set([
      ...defaultGenericNouns,
      ...(options.genericNouns || []),
    ])

    return {
      FunctionDeclaration(node) {
        reportGenericFunctionName(node.id)
      },
      VariableDeclarator(node) {
        if (!isFunction(node.init)) return
        reportGenericFunctionName(node.id)
      },
      Property(node) {
        if (!isFunction(node.value)) return
        reportGenericFunctionName(node.key)
      },
      MethodDefinition(node) {
        if (!isFunction(node.value)) return
        reportGenericFunctionName(node.key)
      },
    }

    function reportGenericFunctionName(node) {
      const name = getName(node)
      if (!name) return
      if (!isGenericFunctionName(name, { genericNames, genericVerbs, genericNouns })) return

      context.report({
        node,
        messageId: 'genericFunctionName',
        data: { name },
      })
    }
  },
}

function isGenericFunctionName(name, { genericNames, genericVerbs, genericNouns }) {
  if (genericNames.has(name)) return true
  if (/(filter|map|reduce|sort)And(filter|map|reduce|sort)/i.test(name)) return true

  const [verb, ...nounParts] = splitName(name)
  if (!verb || nounParts.length === 0) return false

  const noun = nounParts.join('').toLowerCase()
  return genericVerbs.has(verb) && genericNouns.has(noun)
}

function splitName(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.toLowerCase())
}

function isFunction(node) {
  const expression = unwrapExpression(node)
  return Boolean(
    expression &&
    [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
    ].includes(expression.type)
  )
}

function getName(node) {
  if (!node) return null
  if (node.type === 'Identifier') return node.name
  if (node.type === 'Literal') return String(node.value)
  return null
}
