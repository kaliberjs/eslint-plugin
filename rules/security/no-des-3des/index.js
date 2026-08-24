const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// DES (56-bit key), 3DES (64-bit block, Sweet32, deprecated by NIST) and RC4
// (broken) are still exposed by node:crypto through the algorithm string —
// a literal match with essentially zero false positives.
const WEAK_ALGORITHM = /^(des|des3|des-|rc2|rc4|bf-|cast5)/i

const CIPHER_FACTORIES = new Set(['createCipheriv', 'createDecipheriv'])

// crypto-js exposes the same ciphers as constructor-style callables.
const CRYPTO_JS_WEAK = new Set(['DES', 'TripleDES', 'RC4', 'RC4Drop', 'Rabbit', 'RabbitLegacy'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use DES, 3DES, RC4 or other retired ciphers (CWE-327)',
      url: docsUrl(__dirname),
    },
    messages: {
      weakAlgorithm: [
        "The cipher algorithm '{{ algorithm }}' is retired: DES has a 56-bit key, 3DES has a 64-bit block (Sweet32) and is deprecated by NIST, RC4 is broken.",
        'Use aes-256-gcm or chacha20-poly1305.',
      ].join(' '),
      cryptoJsWeakCipher: [
        'CryptoJS.{{ name }} is a retired cipher.',
        'Use aes-256-gcm or chacha20-poly1305.',
      ].join(' '),
    },
    // No fix: replacing the cipher changes key lengths and may break
    // interop with whatever reads the ciphertext.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const name = callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : callee.name
        if (!CIPHER_FACTORIES.has(name)) return

        const algorithm = node.arguments[0]
        if (!algorithm) return
        const value = getStaticValue(algorithm, context.sourceCode.getScope(algorithm))
        if (typeof value?.value !== 'string' || !WEAK_ALGORITHM.test(value.value)) return

        report(context, {
          node: algorithm,
          messageId: 'weakAlgorithm',
          data: { algorithm: value.value },
          severity: 'high',
          confidence: 1,
        })
      },

      // CryptoJS.DES.encrypt(...) and friends. Matched on the property name;
      // these names only exist on the crypto-js namespace.
      MemberExpression(node) {
        if (node.computed || node.property?.type !== 'Identifier') return
        if (!CRYPTO_JS_WEAK.has(node.property.name)) return

        report(context, {
          node,
          messageId: 'cryptoJsWeakCipher',
          data: { name: node.property.name },
          severity: 'high',
          confidence: 1,
        })
      },
    }
  },
}
