const docsUrl = require('../../machinery/docsUrl')

const CREDENTIAL_NAMES = /^(password|passwd|secret|api_?key|apikey|token|auth_?token|access_?token|private_?key|credential|client_?secret)$/i
const API_KEY_PATTERNS = [
  /^AKIA[0-9A-Z]{16}$/,
  /^ghp_[a-zA-Z0-9]{36}$/,
  /^sk-[a-zA-Z0-9]{32,}$/,
  /^xox[bpsa]-[a-zA-Z0-9-]+$/,
]

function isCredentialName(name) {
  return typeof name === 'string' && CREDENTIAL_NAMES.test(name)
}

function looksLikeApiKey(value) {
  if (typeof value !== 'string' || value.length < 8) return false
  return API_KEY_PATTERNS.some(pattern => pattern.test(value))
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects hardcoded credentials, API keys, and secrets in source code',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      hardcodedCredential: 'Hardcoded {{type}} detected — use environment variables or a secrets manager instead',
    },
  },
  create(context) {
    function checkAssignment(nameNode, valueNode) {
      if (!valueNode || valueNode.type !== 'Literal' || typeof valueNode.value !== 'string') return
      if (valueNode.value === '' || valueNode.value.length < 4) return

      const name = nameNode.type === 'Identifier' ? nameNode.name
        : nameNode.type === 'Property' && nameNode.key.type === 'Identifier' ? nameNode.key.name
        : null

      if (name && isCredentialName(name)) {
        context.report({
          node: valueNode,
          messageId: 'hardcodedCredential',
          data: { type: name },
        })
        return
      }

      if (looksLikeApiKey(valueNode.value)) {
        context.report({
          node: valueNode,
          messageId: 'hardcodedCredential',
          data: { type: 'API key' },
        })
      }
    }

    return {
      VariableDeclarator(node) {
        checkAssignment(node.id, node.init)
      },
      AssignmentExpression(node) {
        if (node.left.type === 'Identifier') {
          checkAssignment(node.left, node.right)
        }
        if (node.left.type === 'MemberExpression' && node.left.property.type === 'Identifier') {
          checkAssignment({ type: 'Identifier', name: node.left.property.name }, node.right)
        }
      },
      Property(node) {
        checkAssignment(node, node.value)
      },
    }
  },
}
