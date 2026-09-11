const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { NAME_ONLY_CONFIDENCE } = require('../../../machinery/security/provenance')

// `===` on a secret is not constant-time: string comparison short-circuits
// at the first differing byte, leaking how much of the guess was right,
// one byte per request. crypto.timingSafeEqual exists for exactly this.
//
// Audit-only, and the weakest inference in the set. Whether an identifier
// called `token` holds secret material is a guess from its name, and whether
// a byte-at-a-time timing difference is remotely observable depends on the
// network, the runtime and what else the handler does — neither is visible
// here. Confidence is capped at medium for the first, and the message says
// "looks like" rather than "is" for both. Deliberately absent from
// configs.security.

// `hash` was in this list and was the single largest false-positive family in
// the dogfood run: eight of fourteen findings across sixty projects were a
// `location.hash` fragment compared against an anchor id. A URL fragment is not
// secret material, and `passwordHash` / `tokenHash` still match through their
// other half. `hmac` and `signature` stay — those names mean what they say.
const SECRET_NAME = /secret|token|password|passwd|signature|hmac|apikey|api[-_]key/i

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not compare secrets with === (timing side channel, CWE-208)',
      url: docsUrl(__dirname),
    },
    messages: {
      timingUnsafeCompare: [
        "'{{ operator }}' compares what looks like secret material ({{ name }}).",
        'String comparison short-circuits at the first differing byte, so response timing leaks the comparison result byte by byte.',
        'Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) — after checking lengths.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== '===' && node.operator !== '!==') return

        const named = [node.left, node.right].find(side =>
          side?.type === 'Identifier' && SECRET_NAME.test(side.name)
        )
        if (!named) return

        // An existence/emptiness check ("is there a value at all"), not a
        // comparison against an expected secret — nothing about a secret's
        // bytes is leaked by learning whether it is present. Found as a
        // real false positive in a dogfood run: `hash !== ''`, where hash
        // was a URL fragment, not secret material.
        const other = node.left === named ? node.right : node.left
        if (isEmptyCheck(other)) return

        report(context, {
          node,
          messageId: 'timingUnsafeCompare',
          data: { operator: node.operator, name: named.name },
          severity: 'medium',
          confidence: NAME_ONLY_CONFIDENCE,
        })
      },
    }
  },
}

function isEmptyCheck(node) {
  if (node?.type === 'Identifier') return node.name === 'undefined'
  if (node?.type === 'Literal') return node.value === null || node.value === ''
  return false
}
