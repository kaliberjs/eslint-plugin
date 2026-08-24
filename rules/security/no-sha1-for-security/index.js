const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// SHA-1 is collision-broken (SHAttered, 2017). Same shape and same honest
// tension as the MD5 rule: legitimate non-security uses exist (git object
// ids, legacy interop), so warn-level, line-disable escape hatch.

const NODE_HASH_FACTORIES = new Set(['createHash', 'createHmac'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use SHA-1 where collision resistance matters (CWE-328)',
      url: docsUrl(__dirname),
    },
    messages: {
      sha1Hash: [
        'SHA-1 is used here via {{ what }}.',
        'SHA-1 is collision-broken; signatures, integrity guarantees and identifiers derived from attacker-controlled data must not rely on it.',
        'Use SHA-256; for password storage use bcrypt or argon2.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const name = getCalleeName(node.callee)
        if (!name) return

        if (NODE_HASH_FACTORIES.has(name) && isSha1(context, node.arguments[0])) {
          return reportSha1(context, node, `${name}('sha1')`)
        }

        // crypto-js: CryptoJS.SHA1(x), HmacSHA1(m, k).
        if (node.callee.type === 'MemberExpression' && !node.callee.computed && /^(hmac)?sha1$/i.test(String(node.callee.property?.name ?? ''))) {
          return reportSha1(context, node, `CryptoJS.${node.callee.property.name}`)
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

function isSha1(context, argument) {
  if (!argument) return false
  const value = getStaticValue(argument, context.sourceCode.getScope(argument))
  return typeof value?.value === 'string'
    && ['sha1', 'ssl3-sha1', 'sha1withrsaencryption'].includes(value.value.toLowerCase())
}

function reportSha1(context, node, what) {
  report(context, {
    node,
    messageId: 'sha1Hash',
    data: { what },
    severity: 'medium',
    confidence: 1,
  })
}
