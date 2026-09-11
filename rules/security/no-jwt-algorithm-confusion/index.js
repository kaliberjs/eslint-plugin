const { findVariable } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { importedFrom } = require('../../../machinery/security/provenance')

// Positive-obligation rule: `verify()` without an explicit `algorithms`
// allowlist lets the token's own header choose the algorithm. With an RSA
// public key as the HMAC secret that is a signature forgery
// (CVE-2022-23541, CVE-2022-23540). RFC 8725 §3.1: never select the
// algorithm from the token.
//
// The rule cannot see the key type, so it reports at medium confidence and
// leaves "is this key symmetric anyway" to the reader.
//
// The callee is resolved to a JWT module rather than matched on the receiver
// name: `verify` is what half the validators in a codebase are called, and a
// rule in the default preset does not get to guess. `const jwt = { verify }`
// of someone's own making is correctly not this.

const JWT_MODULES = /^(jsonwebtoken|jose|jws)$/

const VERIFIERS = new Set(['verify', 'jwtVerify'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Always pin the accepted JWT algorithms when verifying (CWE-347)',
      url: docsUrl(__dirname),
    },
    messages: {
      missingAlgorithms: [
        '{{ callee }} verifies the token without an algorithms allowlist.',
        'The token header then chooses the verification algorithm, which enables algorithm-confusion forgery.',
        'Pass options with an explicit list, for example { algorithms: [\'RS256\'] }, consistent with the key type.',
      ].join(' '),
      singularAlgorithmTypo: [
        '{{ callee }} has an \'algorithm\' option, but jsonwebtoken only recognizes the plural \'algorithms\' (an array) for verify().',
        '\'algorithm\' is silently ignored, so this call has no algorithm restriction in practice — the token header then chooses the verification algorithm, which enables algorithm-confusion forgery.',
        'Did you mean { algorithms: [...] }?',
      ].join(' '),
    },
    // No fix: the correct algorithm list depends on the keys in use.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (!VERIFIERS.has(importedFrom(context.sourceCode, callee, JWT_MODULES))) return

        // verify(token, key, options?, callback?)
        const options = findOptionsObject(context, node.arguments)

        if (!options || !hasAlgorithms(options)) {
          const isSingularTypo = options && hasSingularAlgorithm(options)
          report(context, {
            node,
            messageId: isSingularTypo ? 'singularAlgorithmTypo' : 'missingAlgorithms',
            data: { callee: context.sourceCode.getText(callee) },
            severity: 'high',
            confidence: 0.6,
          })
        }
      },
    }
  },
}

/**
 * The options object is the third argument in jsonwebtoken's API — but only
 * when there is no callback-only form (`verify(token, key, cb)`). Any object
 * literal among arguments after the first two counts, including one held in a
 * local `const` — the callback form reads far better with the options lifted
 * out, and requiring them inline made this rule fire on
 *
 *   const options = { ignoreExpiration: true, algorithms: ['RS256'] }
 *   jwt.verify(token, publicKey, options, (err, decoded) => …)
 *
 * which is a correctly pinned call. Found in a dogfood run.
 *
 * One hop only, and only to an object literal, matching the depth every other
 * matcher here resolves to. An options object built elsewhere, or a property of
 * something else (`config.jwtOptions`), is still reported: the rule genuinely
 * cannot see whether it pins the algorithms.
 */
function findOptionsObject(context, args) {
  for (const argument of args.slice(2)) {
    const resolved = objectLiteralFor(context, argument)
    if (resolved) return resolved
  }
  return null
}

function objectLiteralFor(context, node) {
  if (node.type === 'ObjectExpression') return node
  if (node.type !== 'Identifier') return null

  const definition = findVariable(context.sourceCode.getScope(node), node)?.defs[0]
  if (definition?.type !== 'Variable') return null

  return definition.node.init?.type === 'ObjectExpression' ? definition.node.init : null
}

function hasAlgorithms(options) {
  return options.properties.some(
    property => property.type === 'Property'
      && getStaticPropertyName(property) === 'algorithms'
      && !(property.value.type === 'Literal' && property.value.value === false)
  )
}

/**
 * `algorithm` (singular) is `sign()`'s option name, not `verify()`'s —
 * jsonwebtoken's verify() silently ignores it. A call that has this but
 * not `algorithms` is reachable *because* of that exact typo, not because
 * no restriction was ever attempted, and deserves a sharper message.
 */
function hasSingularAlgorithm(options) {
  return options.properties.some(
    property => property.type === 'Property' && getStaticPropertyName(property) === 'algorithm'
  )
}
