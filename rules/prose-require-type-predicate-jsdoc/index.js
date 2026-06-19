const docsUrl = require('../../machinery/docsUrl')
const {
  isPredicateName,
  unwrapExpression,
} = require('../../machinery/prose/ast')

const typePredicatePattern = /@returns?\s*\{[^}]*\bis\b[^}]*\}/

const messages = {
  missingTypePredicateJsdoc:
    "Type predicate function '{{name}}' should have JSDoc with @returns {paramName is TypeName}.",
  missingTypePredicateReturn:
    "Type predicate function '{{name}}' has JSDoc but is missing @returns {paramName is TypeName}.",
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require type predicate JSDoc on predicate-named functions',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    const sourceCode = context.sourceCode

    return {
      FunctionDeclaration(node) {
        if (!node.id) return
        checkFunction(node.id.name, node)
      },
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return

        const init = unwrapExpression(node.init)
        if (!isFunction(init)) return

        checkFunction(node.id.name, node)
      },
    }

    function checkFunction(name, node) {
      if (!isPredicateName(name)) return

      const functionNode = node.type === 'VariableDeclarator'
        ? unwrapExpression(node.init)
        : node

      if (!hasParameters(functionNode)) return

      const commentTarget = node.type === 'VariableDeclarator'
        ? node.parent
        : node

      const jsdocComment = getJSDocComment(sourceCode, commentTarget)
      const reportNode = node.type === 'VariableDeclarator' ? node.id : node.id || node

      if (!jsdocComment) {
        context.report({
          node: reportNode,
          messageId: 'missingTypePredicateJsdoc',
          data: { name },
        })
        return
      }

      if (!typePredicatePattern.test(jsdocComment.value)) {
        context.report({
          node: reportNode,
          messageId: 'missingTypePredicateReturn',
          data: { name },
        })
      }
    }
  },
}

function isFunction(node) {
  return Boolean(
    node &&
    [
      'FunctionDeclaration',
      'FunctionExpression',
      'ArrowFunctionExpression',
    ].includes(node.type)
  )
}

function hasParameters(node) {
  return node && node.params && node.params.length > 0
}

function getJSDocComment(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node)
  if (!comments.length) return null

  const last = comments[comments.length - 1]
  if (last.type !== 'Block' || !last.value.startsWith('*')) return null

  return last
}
