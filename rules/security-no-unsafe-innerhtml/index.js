const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression } = require('../../machinery/security')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unsafe innerHTML/outerHTML assignments with non-literal values, which can lead to XSS',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      unsafeInnerHtml: 'Assigning a non-literal value to {{property}} can lead to Cross-Site Scripting (XSS) — use textContent or sanitize the input',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()
    return {
      AssignmentExpression(node) {
        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()
        if (
          node.operator === '=' &&
          node.left.type === 'MemberExpression' &&
          node.left.property.type === 'Identifier' &&
          ['innerHTML', 'outerHTML'].includes(node.left.property.name) &&
          !isStaticExpression(node.right, scope)
        ) {
          context.report({
            node,
            messageId: 'unsafeInnerHtml',
            data: { property: node.left.property.name },
          })
        }
      },
    }
  },
}
