const docsUrl = require('../../machinery/docsUrl')

const WEAK_ALGORITHMS = ['md4', 'md5', 'sha1', 'ripemd160']
const WEAK_PACKAGES = ['md5', 'sha1', 'md4']

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects usage of weak cryptographic hash algorithms (MD5, SHA1) that are vulnerable to collision attacks',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      weakCrypto: "Weak cryptographic hash algorithm '{{algorithm}}' — use SHA-256 or stronger instead",
      weakCryptoPackage: "Importing weak cryptographic package '{{name}}' — use crypto.createHash('sha256') instead",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'createHash' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          WEAK_ALGORITHMS.includes(node.arguments[0].value.toLowerCase())
        ) {
          context.report({
            node,
            messageId: 'weakCrypto',
            data: { algorithm: node.arguments[0].value },
          })
        }

        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          WEAK_PACKAGES.includes(node.arguments[0].value)
        ) {
          context.report({
            node,
            messageId: 'weakCryptoPackage',
            data: { name: node.arguments[0].value },
          })
        }
      },
      ImportDeclaration(node) {
        if (WEAK_PACKAGES.includes(node.source.value)) {
          context.report({
            node,
            messageId: 'weakCryptoPackage',
            data: { name: node.source.value },
          })
        }
      },
    }
  },
}
