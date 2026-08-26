const { getStaticValue, findVariable } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName, getCalleeName } = require('../../../machinery/ast')
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
        if (!isStaticValue(context, iv)) return

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
        if (getStaticPropertyName(node) !== 'iv') return
        if (!isStaticValue(context, node.value)) return

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

/**
 * Literals — including a const alias, folded through getStaticValue rather
 * than requiring an inline node — and Buffer.from/alloc of one are static
 * by construction. A const alias *of* a Buffer.from/alloc call
 * (`const IV = Buffer.from('fixed'); …(IV)`) is resolved one hop through
 * its initializer, since getStaticValue does not evaluate Buffer calls and
 * would otherwise give up at the identifier.
 */
function isStaticValue(context, node) {
  if (!node) return false
  if (getStaticValue(node, context.sourceCode.getScope(node))) return true
  if (isStaticBufferCall(context, node)) return true

  if (node.type === 'Identifier') {
    const variable = findVariable(context.sourceCode.getScope(node), node)
    const init = variable?.defs[0]?.type === 'Variable' ? variable.defs[0].node.init : null
    if (isStaticBufferCall(context, init)) return true
  }

  return false
}

function isStaticBufferCall(context, node) {
  if (node?.type !== 'CallExpression') return false
  const name = getCalleeName(node.callee)
  const argument = node.arguments[0]
  return (name === 'from' || name === 'alloc') && Boolean(argument) && Boolean(getStaticValue(argument, context.sourceCode.getScope(argument)))
}
