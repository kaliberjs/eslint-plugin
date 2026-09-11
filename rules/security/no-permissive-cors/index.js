const { getPropertyName, getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName, getCalleeName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Origin reflection together with credentials turns any website into an
// authenticated reader of your API: the attacker's page sends a victim's
// browser to your endpoint, the server echoes the attacker's origin back
// with Access-Control-Allow-Credentials, and the response is readable.
// Bare `cors()` / origin:'*' on a public API is deliberately not flagged —
// per the research entry it is info-level noise, not a finding.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not reflect request origins into CORS with credentials enabled (CWE-942)',
      url: docsUrl(__dirname),
    },
    messages: {
      reflectedOrigin: [
        'The CORS policy reflects the request origin while allowing credentials.',
        'Any website can then read authenticated responses from this endpoint as the victim.',
        'Use an explicit allowlist of origins compared by equality.',
      ].join(' '),
      wildcardCredentials: [
        "'Access-Control-Allow-Origin: *' is sent together with Allow-Credentials.",
        'Browsers reject this combination today, but it signals a misconfiguration and breaks when tightened.',
        'Allow-list the exact origins that need credentialed access.',
      ].join(' '),
    },
    // No fix: the correct allowlist is application knowledge.
    schema: [],
  },

  create(context) {
    // Cross-statement correlation for the wildcard+credentials pair.
    let wildcardOrigin = null
    let allowCredentials = null

    return {
      CallExpression(node) {
        const callee = node.callee
        const name = getCalleeName(callee)

        if (name === 'cors' || name === 'enableCors') {
          const options = node.arguments[0]
          if (options?.type !== 'ObjectExpression') return
          checkCorsOptions(options)
          return
        }

        if (name !== 'setHeader') return
        const header = headerName(context, node.arguments[0])
        if (header === 'access-control-allow-origin') {
          if (reflectsRequestOrigin(node.arguments[1])) {
            report(context, { node, messageId: 'reflectedOrigin', severity: 'medium', confidence: 0.9 })
          } else if (isWildcard(context, node.arguments[1])) {
            wildcardOrigin = node
          }
        }
        if (header === 'access-control-allow-credentials' && isTruthyLiteral(context, node.arguments[1])) {
          allowCredentials = node
        }
      },

      'Program:exit'() {
        if (wildcardOrigin && allowCredentials) {
          report(context, { node: allowCredentials, messageId: 'wildcardCredentials', severity: 'medium', confidence: 1 })
        }
      },
    }

    function checkCorsOptions(options) {
      for (const property of options.properties) {
        if (property.type !== 'Property' || getStaticPropertyName(property) !== 'origin') continue

        const value = property.value
        const staticValue = getStaticValue(value, context.sourceCode.getScope(value))

        // origin: true — full reflection.
        if (staticValue?.value === true) {
          report(context, { node: property, messageId: 'reflectedOrigin', severity: 'medium', confidence: 1 })
        }

        // origin: (origin, callback) => callback(null, true)
        if ((value?.type === 'ArrowFunctionExpression' || value?.type === 'FunctionExpression') && returnsTrueCallback(value)) {
          report(context, { node: property, messageId: 'reflectedOrigin', severity: 'medium', confidence: 0.9 })
        }
      }
    }

    /** Any call whose second argument folds to true inside the delegate. */
    function returnsTrueCallback(fn) {
      let found = false
      walk(fn.body)
      return found

      function walk(node) {
        if (!node || typeof node.type !== 'string' || found) return
        if (node.type === 'CallExpression' && node.arguments[1]?.type === 'Literal' && node.arguments[1].value === true) {
          found = true
          return
        }
        for (const key of Object.keys(node)) {
          if (key === 'parent') continue
          const value = node[key]
          if (Array.isArray(value)) value.forEach(walk)
          else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value)
        }
      }
    }

    function reflectsRequestOrigin(argument) {
      if (argument?.type !== 'MemberExpression') return false
      const name = getPropertyName(argument, context.sourceCode.getScope(argument))
      return String(name ?? '').toLowerCase() === 'origin'
    }
  },
}

function headerName(context, argument) {
  if (argument?.type !== 'Literal' || typeof argument.value !== 'string') {
    return getPropertyName(argument, context.sourceCode.getScope(argument))?.toLowerCase?.()
  }
  return String(argument.value).toLowerCase()
}

function isWildcard(context, argument) {
  const value = argument && getStaticValue(argument, context.sourceCode.getScope(argument))
  return value?.value === '*'
}

function isTruthyLiteral(context, argument) {
  const value = argument && getStaticValue(argument, context.sourceCode.getScope(argument))
  return value?.value === true || value?.value === 'true'
}
