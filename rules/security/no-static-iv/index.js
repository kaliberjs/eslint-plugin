const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// A fixed IV destroys the semantic guarantee of the block cipher mode:
// identical plaintext plus identical key produces identical ciphertext, and
// for CBC it enables chosen-plaintext attacks. The IV must be fresh per
// encryption. The slice: node:crypto factories whose IV argument is static.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use a fixed initialization vector (CWE-329)',
      url: docsUrl(__dirname),
    },
    messages: {
      staticIv: [
        '{{ what }} receives its IV as a static value.',
        'Reusing an IV makes equal plaintexts observable and enables chosen-plaintext attacks.',
        'Generate the IV per encryption with crypto.randomBytes(16) and transmit it alongside the ciphertext.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const name = getCalleeName(callee)
        // The IV is argument 2 of both factories.
        if (name !== 'createCipheriv' && name !== 'createDecipheriv') return

        const iv = node.arguments[2]
        if (!isStaticValue(iv)) return

        report(context, {
          node,
          messageId: 'staticIv',
          data: { what: `${name}()` },
          severity: 'medium',
          confidence: 1,
        })
      },

      Property(node) {
        // crypto-js: AES.encrypt(data, key, { iv: literalWordArrayOrString })
        if (node.computed || node.key?.name !== 'iv') return
        if (!isStaticValue(node.value)) return

        report(context, {
          node,
          messageId: 'staticIv',
          data: { what: "the 'iv' option" },
          severity: 'medium',
          confidence: 1,
        })
      },
    }
  },
}

function getCalleeName(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}

/** Literals and Buffer.from/alloc of literals are static by construction. */
function isStaticValue(node) {
  if (!node) return false
  if (node.type === 'Literal') return true

  if (node.type === 'CallExpression') {
    const name = getCalleeName(node.callee)
    if ((name === 'from' || name === 'alloc') && node.arguments[0]?.type === 'Literal') return true
  }

  return false
}
