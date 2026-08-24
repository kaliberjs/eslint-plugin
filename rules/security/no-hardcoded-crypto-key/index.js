const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

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
        if ((name === 'createCipheriv' || name === 'createDecipheriv') && isKeyLike(node.arguments[1])) {
          return emit(context, node.arguments[1], `${name}()`)
        }

        // createHmac(alg, key): key is argument 1. createSecretKey is the
        // correct literal-free path... but createSecretKey('literal') is
        // equally hardcoded, so it is checked too.
        if (name === 'createHmac' && isKeyLike(node.arguments[1])) {
          return emit(context, node.arguments[1], 'createHmac()')
        }
        if (name === 'createSecretKey' && node.arguments[0]?.type === 'Literal') {
          return emit(context, node.arguments[0], 'createSecretKey()')
        }
      },
    }
  },
}

function getCalleeName(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}

/**
 * String literals and hex/base64 literals are keys in source. Buffer.from of
 * a literal is the same thing wearing a coat; matching through to the inner
 * literal keeps the rule honest about the common spelling.
 */
function isKeyLike(node) {
  if (!node) return false

  if (node.type === 'Literal') {
    return typeof node.value === 'string' || typeof node.value === 'number'
  }

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
