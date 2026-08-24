const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// `===` on a secret is not constant-time: string comparison short-circuits
// at the first differing byte, leaking how much of the guess was right,
// one byte per request. crypto.timingSafeEqual exists for exactly this.
// Identifier names gate the rule; flagging every === would be absurd.

const SECRET_NAME = /secret|token|password|passwd|signature|hmac|apikey|api[-_]key|hash/i

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
          severity: 'low',
          confidence: 0.8,
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
