const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { calleeApi, NAME_ONLY_CONFIDENCE } = require('../../../machinery/security/provenance')

// MD5 is collision-broken and fast. The honest tension, per the research
// entry: MD5-for-cache-keys is legitimate and common, so this rule is
// audit-only and the escape hatch is a line disable with a comment — not a
// context heuristic pretending to know what a digest is "for".
//
// `createHash('md5')` resolved to node:crypto is certain. `createHash('md5')`
// on an unknown receiver is a name match, and reports at medium confidence:
// crypto-js ships as a CDN global with no import to resolve, so dropping the
// name path entirely would lose the browser half of this weakness class.

const CRYPTO_MODULE = /^(node:)?crypto$/

const NODE_HASH_FACTORIES = new Set(['createHash', 'createHmac'])

// crypto-js constructor-style: CryptoJS.MD5(x), CryptoJS.HmacMD5(x, key).
const CRYPTO_JS_MD5 = /^(hmac)?md5$/i

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use MD5 for any security purpose (CWE-328)',
      url: docsUrl(__dirname),
    },
    messages: {
      md5Hash: [
        'MD5 is used here via {{ callee }}.',
        'MD5 is collision-broken; it must not be used for signatures, integrity, token derivation or password storage.',
        'Use SHA-256 for integrity, HMAC-SHA256 for authentication, bcrypt or argon2 for passwords.',
      ].join(' '),
    },
    // No fix: the replacement depends on what the digest is used for, which
    // is exactly the judgement call this rule cannot make (cache key vs
    // integrity check).
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const api = calleeApi(context.sourceCode, callee, CRYPTO_MODULE)
        if (!api) return

        if (NODE_HASH_FACTORIES.has(api.name) && isMd5(context, node.arguments[0])) {
          report(context, {
            node,
            messageId: 'md5Hash',
            data: { callee: `${api.name}('md5')` },
            severity: 'medium',
            confidence: api.proven ? 1 : NAME_ONLY_CONFIDENCE,
          })
          return
        }

        // crypto-js: the cipher family is on the property, the argument is data.
        if (callee.type === 'MemberExpression' && !callee.computed && CRYPTO_JS_MD5.test(String(callee.property?.name))) {
          report(context, {
            node,
            messageId: 'md5Hash',
            data: { callee: `CryptoJS.${callee.property.name}` },
            severity: 'medium',
            confidence: NAME_ONLY_CONFIDENCE,
          })
        }
      },
    }
  },
}

function isMd5(context, argument) {
  if (!argument) return false
  const value = getStaticValue(argument, context.sourceCode.getScope(argument))
  if (typeof value?.value !== 'string') return false

  // Exact hash names only; a longer string that merely contains 'md5' is
  // left to the reader rather than guessed at.
  return ['md5', 'ssl3-md5', 'md5withrsaencryption'].includes(value.value.toLowerCase())
}
