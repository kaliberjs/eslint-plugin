const docsUrl = require('../../machinery/docsUrl')

const LOG_METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace']
const LOG_OBJECTS = ['console', 'logger', 'log']
const PII_NAMES = /^(email|ssn|social_?security|credit_?card|creditcard|phone|phone_?number|address|date_?of_?birth|dob|passport|national_?id|bank_?account)$/i

function isPiiName(name) {
  return typeof name === 'string' && PII_NAMES.test(name)
}

function getIdentifierName(node) {
  if (node.type === 'Identifier') return node.name
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') return node.property.name
  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects logging of potentially personally identifiable information (PII)',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      piiInLog: 'Potentially logging PII ({{name}}) — redact or mask sensitive data before logging',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          LOG_OBJECTS.includes(node.callee.object.name) &&
          node.callee.property.type === 'Identifier' &&
          LOG_METHODS.includes(node.callee.property.name)
        ) {
          for (const arg of node.arguments) {
            const name = getIdentifierName(arg)
            if (name && isPiiName(name)) {
              context.report({
                node: arg,
                messageId: 'piiInLog',
                data: { name },
              })
            }
          }
        }
      },
    }
  },
}
