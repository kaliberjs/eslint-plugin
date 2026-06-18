const { firstLetterLowerCase } = require('../../machinery/word')
const { isUniversal } = require('../../machinery/filename')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'no null return':
    `Unexpected 'return null' in universal component — this crashes @kaliber/build. ` +
    `Return a non-rendering element like <span hidden /> instead.`,

  'no empty fragment return':
    `Unexpected empty fragment return in universal component — this crashes @kaliber/build. ` +
    `Return a non-rendering element like <span hidden /> instead.`,

  'no logical and return':
    `Unexpected logical && return in universal component — when the condition is falsy, ` +
    `this crashes @kaliber/build. Use a ternary with a non-rendering element instead.`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow returning null, empty fragments, or implicitly falsy values from universal components',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    if (!isUniversal(context)) return {}

    return {
      ReturnStatement(node) {
        if (!isInsideComponentFunction(node)) return
        checkReturnValue(node.argument)
      },
    }

    function checkReturnValue(expression) {
      if (!expression) return

      if (isNullLiteral(expression)) {
        context.report({
          message: messages['no null return'],
          node: expression,
        })
        return
      }

      if (isEmptyFragment(expression)) {
        context.report({
          message: messages['no empty fragment return'],
          node: expression,
        })
        return
      }

      if (expression.type === 'ConditionalExpression') {
        checkReturnValue(expression.consequent)
        checkReturnValue(expression.alternate)
        return
      }

      if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
        context.report({
          message: messages['no logical and return'],
          node: expression,
        })
      }
    }
  },
}

function isInsideComponentFunction(node) {
  let current = node.parent
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return (
        current.type === 'FunctionDeclaration' &&
        current.id &&
        !firstLetterLowerCase(current.id.name)
      )
    }
    current = current.parent
  }
  return false
}

function isNullLiteral(node) {
  return node.type === 'Literal' && node.value === null
}

function isEmptyFragment(node) {
  if (node.type === 'JSXFragment') return !hasMeaningfulChildren(node)

  if (node.type === 'JSXElement') {
    const { name } = node.openingElement
    const isReactFragment =
      (name.type === 'JSXIdentifier' && name.name === 'Fragment') ||
      (name.type === 'JSXMemberExpression' &&
        name.object.name === 'React' &&
        name.property.name === 'Fragment')

    return isReactFragment && !hasMeaningfulChildren(node)
  }

  return false
}

function hasMeaningfulChildren(node) {
  return node.children.some(child => {
    if (child.type === 'JSXText') return child.value.trim() !== ''
    return true
  })
}
