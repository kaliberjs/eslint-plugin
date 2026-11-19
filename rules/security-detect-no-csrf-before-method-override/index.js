const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects Express csrf middleware setup before method-override middleware, which can bypass CSRF protection',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      csrfBeforeMethodOverride: 'csrf() middleware should come after methodOverride() — otherwise CSRF protection can be bypassed',
    },
  },
  create(context) {
    let csrfFound = false

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'use' &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0]
          if (arg.type === 'CallExpression') {
            const calleeName = arg.callee.type === 'Identifier' ? arg.callee.name : null
            if (calleeName === 'csrf') {
              csrfFound = true
            }
            if (calleeName === 'methodOverride' && csrfFound) {
              context.report({ node, messageId: 'csrfBeforeMethodOverride' })
            }
          }
        }
      },
    }
  },
}
