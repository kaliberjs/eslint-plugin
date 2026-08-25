const { findVariable } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Positive-obligation rule: `verify()` without an explicit `algorithms`
// allowlist lets the token's own header choose the algorithm. With an RSA
// public key as the HMAC secret that is a signature forgery
// (CVE-2022-23541, CVE-2022-23540). RFC 8725 §3.1: never select the
// algorithm from the token.
//
// The rule cannot see the key type, so it reports at medium confidence and
// leaves "is this key symmetric anyway" to the reader.

// Object roots whose .verify() is JWT verification. Note 'jsonwebtoken'
// contains no 'jwt' substring, so it is spelled out.
const JWT_ROOTS = /^(jwt|jsonwebtoken|jws|jose)/i

// Modules a bare `verify` / `jwtVerify` identifier may come from.
const JWT_MODULES = /^(jsonwebtoken|jose|jws)$/

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

        // Member form: jwt.verify, jsonwebtoken.verify, jose.jwtVerify.
        if (callee.type === 'MemberExpression') {
          const name = callee.computed ? null : callee.property?.name
          if (name !== 'verify' && name !== 'jwtVerify') return
          const rootName = callee.object.type === 'Identifier' ? callee.object.name : null
          if (!rootName || !JWT_ROOTS.test(rootName)) return
        }

        // Identifier form. `jwtVerify` is unique to jose; a bare `verify`
        // must be proven to come from a JWT module — matching the name alone
        // would flag every custom validator called verify().
        else if (callee.type === 'Identifier') {
          if (callee.name !== 'verify' && callee.name !== 'jwtVerify') return
          if (callee.name === 'verify' && !isFromJwtModule(context, callee)) return
        } else {
          return
        }

        // verify(token, key, options?, callback?)
        const options = findOptionsObject(node.arguments)

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

function isFromJwtModule(context, identifier) {
  const variable = findVariable(context.sourceCode.getScope(identifier), identifier)
  const definition = variable?.defs[0]
  if (!definition) return false

  if (definition.type === 'ImportBinding') {
    return JWT_MODULES.test(String(definition.parent.source.value))
  }

  // const { verify } = require('jsonwebtoken')
  if (definition.type === 'Variable') {
    const init = definition.node.init
    return init?.type === 'CallExpression'
      && init.callee?.type === 'Identifier'
      && init.callee.name === 'require'
      && init.arguments[0]?.type === 'Literal'
      && JWT_MODULES.test(String(init.arguments[0].value))
  }

  return false
}

/**
 * The options object is the third argument in jsonwebtoken's API — but only
 * when there is no callback-only form (`verify(token, key, cb)`). Any object
 * literal among arguments after the first two counts; anything else means no
 * options were passed.
 */
function findOptionsObject(args) {
  return args.slice(2).find(arg => arg.type === 'ObjectExpression') ?? null
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
