const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { getCalleeName } = require('../../../machinery/ast')

// A key literal in source is not a secret: every holder of the repository
// can decrypt and forge. The precise slice: a string literal passed as the
// *key argument* of node:crypto's cipher/HMAC factories, or as the `key`
// option in database client configs that encrypt connections.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not pass literal keys to crypto factories (CWE-321)',
      url: docsUrl(__dirname),
    },
    messages: {
      hardcodedKey: [
        '{{ what }} receives its key as a literal.',
        'A key in source is not a secret — anyone with the repository can decrypt captured ciphertext or forge signatures.',
        'Load the key from configuration outside the source (env var, KMS, key file).',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const name = getCalleeName(node.callee)
        if (!name) return

        // createCipheriv(alg, key, iv): the key is argument 1.
        if ((name === 'createCipheriv' || name === 'createDecipheriv') && isKeyLike(node.arguments[1], context)) {
          return emit(context, node.arguments[1], `${name}()`)
        }

        // createHmac(alg, key): key is argument 1. createSecretKey is the
        // correct literal-free path... but createSecretKey('literal') is
        // equally hardcoded, so it is checked too.
        if (name === 'createHmac' && isKeyLike(node.arguments[1], context)) {
          return emit(context, node.arguments[1], 'createHmac()')
        }
        if (name === 'createSecretKey' && isKeyLike(node.arguments[0], context)) {
          return emit(context, node.arguments[0], 'createSecretKey()')
        }
      },
    }
  },
}

/**
 * String literals and hex/base64 literals are keys in source, including
 * one written as a const alias — folded through getStaticValue rather than
 * requiring an inline Literal node, so `const KEY = '...'; createHmac(a,
 * KEY)` is the same finding as the inline form. Buffer.from of a literal is
 * the same thing wearing a coat; matching through to the inner literal
 * keeps the rule honest about the common spelling.
 */
function isKeyLike(node, context) {
  if (!node) return false

  const staticValue = getStaticValue(node, context.sourceCode.getScope(node))
  if (staticValue) return typeof staticValue.value === 'string' || typeof staticValue.value === 'number'

  if (
    node.type === 'CallExpression'
    && getCalleeName(node.callee) === 'from'
    && node.arguments[0]?.type === 'Literal'
  ) {
    return true
  }

  return false
}

function emit(context, node, what) {
  report(context, {
    node,
    messageId: 'hardcodedKey',
    data: { what },
    severity: 'medium',
    confidence: 1,
  })
}
