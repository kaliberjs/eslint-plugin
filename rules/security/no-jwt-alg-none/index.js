const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// `alg: none` means unsigned: a verifier that accepts it accepts any token an
// attacker writes. RFC 8725 §3.1 requires that verifiers never select the
// algorithm from the token header. The check is a literal in an options
// object — catastrophic impact, essentially no false positives outside
// security tests that deliberately assert rejection.
const ALGORITHM_KEYS = new Set(['algorithm', 'algorithms'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: "Do not accept or produce JWTs signed with the 'none' algorithm (CWE-347)",
      url: docsUrl(__dirname),
    },
    messages: {
      algNone: [
        "JWT {{ key }} includes 'none', which means unsigned.",
        'A verifier configured this way accepts any token an attacker writes.',
        'Pin explicit algorithms that exclude none, for example algorithms: [\'RS256\'].',
      ].join(' '),
    },
    // No fix: choosing the correct algorithm list depends on the keys in use,
    // which is a human decision. See AGENTS.md.
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        const key = propertyName(node)
        if (!ALGORITHM_KEYS.has(key)) return

        const noneNode = findNone(node.value)
        if (!noneNode) return

        report(context, {
          node,
          messageId: 'algNone',
          data: { key },
          severity: 'high',
          confidence: 1,
        })
      },
    }
  },
}

function propertyName(property) {
  if (property.computed) return property.key?.type === 'Literal' ? String(property.key.value) : undefined
  return property.key?.name ?? property.key?.value
}

/**
 * The singular form is a direct comparison against `'none'`; the plural form
 * is an array containing it. Both spellings appear in the wild — jsonwebtoken
 * uses `algorithms`, older versions and jwt-simple use `algorithm`.
 */
function findNone(value) {
  if (value.type === 'Literal') return value.value === 'none' ? value : null

  if (value.type === 'ArrayExpression') {
    return value.elements.find(
      element => element?.type === 'Literal' && element.value === 'none'
    ) || null
  }

  return null
}
