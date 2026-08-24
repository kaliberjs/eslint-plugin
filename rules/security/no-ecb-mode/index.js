const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// ECB encrypts identical plaintext blocks to identical ciphertext blocks,
// leaking structure and permitting block reordering. It is never the right
// mode for application data, and Node exposes it through the algorithm
// string passed to createCipheriv — a literal substring check.
const CIPHER_FACTORIES = new Set(['createCipheriv', 'createDecipheriv'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use ECB block cipher mode (CWE-327)',
      url: docsUrl(__dirname),
    },
    messages: {
      ecbAlgorithm: [
        "The cipher algorithm '{{ algorithm }}' uses ECB mode.",
        'ECB encrypts identical plaintext blocks identically, leaking structure and permitting block reordering.',
        'Use an authenticated mode instead: aes-256-gcm or chacha20-poly1305.',
      ].join(' '),
      createCipher: [
        'crypto.createCipher() derives its key from the passphrase with MD5 and its IV implicitly.',
        'It is deprecated precisely because this is not cryptographically sound.',
        'Use crypto.createCipheriv() with an explicit key, IV, and an authenticated mode such as aes-256-gcm.',
      ].join(' '),
      ecbMode: [
        'CryptoJS.mode.ECB encrypts identical plaintext blocks identically, leaking structure.',
        'Use CryptoJS.mode.GCM-compatible construction, or better, node:crypto with aes-256-gcm.',
      ].join(' '),
    },
    // No fix: replacing the algorithm changes key and IV requirements.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const name = callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : callee.name

        // createCipher (no iv argument) is deprecated because its key
        // derivation is MD5-based; it belongs to this weakness class.
        if (name === 'createCipher') {
          report(context, { node, messageId: 'createCipher', severity: 'high', confidence: 1 })
          return
        }

        if (!CIPHER_FACTORIES.has(name)) return

        const algorithm = node.arguments[0]
        if (algorithm?.type !== 'Literal' || typeof algorithm.value !== 'string') return
        if (!/-ecb$/i.test(algorithm.value)) return

        report(context, {
          node: algorithm,
          messageId: 'ecbAlgorithm',
          data: { algorithm: algorithm.value },
          severity: 'high',
          confidence: 1,
        })
      },

      // crypto-js: { mode: CryptoJS.mode.ECB }
      Property(node) {
        if (node.computed || node.key?.name !== 'mode') return

        const value = node.value
        const isEcb = value?.type === 'MemberExpression'
          && value.property?.type === 'Identifier'
          && value.property.name === 'ECB'

        if (!isEcb) return

        report(context, { node, messageId: 'ecbMode', severity: 'high', confidence: 1 })
      },
    }
  },
}
