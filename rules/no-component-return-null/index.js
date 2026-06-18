const { firstLetterLowerCase } = require('../../machinery/word')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'no return null':
    `Avoid returning \`null\` from a component. When this component is rendered universally ` +
    `(client-side), the build tool calls \`.slice()\` on its result and \`null\` will throw. ` +
    `Return an empty fragment \`<></>\` instead, or render this component conditionally from its parent.`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description: 'Disallow returning `null` from components — it breaks `.slice()` during universal (client-side) rendering',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    return {
      ReturnStatement(node) {
        if (!node.argument || !yieldsNull(node.argument)) return

        const fn = getEnclosingFunction(node)
        if (!fn || !isComponent(fn)) return

        report(node, node.argument)
      },

      ArrowFunctionExpression(node) {
        if (node.body.type === 'BlockStatement' || !yieldsNull(node.body)) return
        if (!isComponent(node)) return

        report(node.body, node.body)
      },
    }

    function report(node, valueNode) {
      context.report({
        node,
        message: messages['no return null'],
        suggest: [
          {
            desc: 'Replace `null` with an empty fragment `<></>`',
            fix(fixer) {
              return getNullNodes(valueNode).map(nullNode => fixer.replaceText(nullNode, '<></>'))
            },
          },
        ],
      })
    }
  },
}

function isComponent(fn) {
  const name = getComponentName(fn)
  return Boolean(name) && !firstLetterLowerCase(name)
}

function getComponentName(fn) {
  if (fn.id) return fn.id.name

  const { parent } = fn
  if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name

  // const Component = forwardRef(() => …) / memo(forwardRef(() => …))
  let current = parent
  while (current && current.type === 'CallExpression') current = current.parent
  if (current && current.type === 'VariableDeclarator' && current.id.type === 'Identifier') return current.id.name

  return null
}

function getEnclosingFunction(node) {
  const functionTypes = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']
  let current = node.parent
  while (current) {
    if (functionTypes.includes(current.type)) return current
    current = current.parent
  }
  return null
}

function yieldsNull(node) {
  if (isNullLiteral(node)) return true
  if (node.type === 'ConditionalExpression') return yieldsNull(node.consequent) || yieldsNull(node.alternate)
  return false
}

function getNullNodes(node) {
  if (isNullLiteral(node)) return [node]
  if (node.type === 'ConditionalExpression') return [...getNullNodes(node.consequent), ...getNullNodes(node.alternate)]
  return []
}

function isNullLiteral(node) {
  return node.type === 'Literal' && node.value === null && node.raw === 'null'
}
