const { getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { calleeApi, NAME_ONLY_CONFIDENCE } = require('../../../machinery/security/provenance')

// ECB encrypts identical plaintext blocks to identical ciphertext blocks,
// leaking structure and permitting block reordering. It is never the right
// mode for application data, and Node exposes it through the algorithm
// string passed to createCipheriv — a literal substring check.
//
// Confidence follows provenance: high when the factory resolves to a
// node:crypto import, medium when only the name matched. The crypto-js
// `{ mode: CryptoJS.mode.ECB }` shape has no import to resolve at all and is
// always the medium case — which is why this rule is audit-only.

const CRYPTO_MODULE = /^(node:)?crypto$/

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
        const api = calleeApi(context.sourceCode, node.callee, CRYPTO_MODULE)
        if (!api) return
        const confidence = api.proven ? 1 : NAME_ONLY_CONFIDENCE

        // createCipher (no iv argument) is deprecated because its key
        // derivation is MD5-based; it belongs to this weakness class.
        if (api.name === 'createCipher') {
          report(context, { node, messageId: 'createCipher', severity: 'high', confidence })
          return
        }

        if (!CIPHER_FACTORIES.has(api.name)) return

        const algorithm = node.arguments[0]
        if (!algorithm) return
        const value = getStaticValue(algorithm, context.sourceCode.getScope(algorithm))
        if (typeof value?.value !== 'string' || !/-ecb$/i.test(value.value)) return

        report(context, {
          node: algorithm,
          messageId: 'ecbAlgorithm',
          data: { algorithm: value.value },
          severity: 'high',
          confidence,
        })
      },

      // crypto-js: { mode: CryptoJS.mode.ECB }
      Property(node) {
        if (getStaticPropertyName(node) !== 'mode') return

        const value = node.value
        const isEcb = value?.type === 'MemberExpression'
          && value.property?.type === 'Identifier'
          && value.property.name === 'ECB'

        if (!isEcb) return

        report(context, { node, messageId: 'ecbMode', severity: 'high', confidence: NAME_ONLY_CONFIDENCE })
      },
    }
  },
}
