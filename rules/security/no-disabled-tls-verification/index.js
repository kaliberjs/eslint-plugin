const { getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// The option names below are TLS-specific with no other plausible meaning, so
// matching them anywhere in an object literal is deliberate: an options object
// is often built standalone and spread into the actual request later, and
// flagging it at the definition catches that too. The known cost — a fixture
// object never used for a real connection — is small against the alternative
// of missing a `rejectUnauthorized: false` added "temporarily" during
// debugging and shipped by accident.
const DISABLED_VERIFICATION = new Set(['rejectUnauthorized', 'strictSSL'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not disable TLS certificate or hostname verification (CWE-295, OWASP A02:2021-Cryptographic Failures)',
      url: docsUrl(__dirname),
    },
    messages: {
      verificationDisabled: [
        '{{ property }}: false disables certificate verification for this connection.',
        'Any network-position attacker can intercept it.',
        'Supply the correct CA bundle instead (`ca:` option), or pin the certificate.',
      ].join(' '),
      hostnameVerificationDisabled: [
        'Overriding checkServerIdentity without throwing accepts any hostname.',
        'The connection is no longer verified to be who it claims to be.',
        'If the certificate is valid but the hostname differs, fix the certificate or use an explicit allowlist that still throws on mismatch.',
      ].join(' '),
    },
    // No fix and no suggestion. The correct remediation is supplying a CA
    // bundle, which is not a mechanical transformation. See AGENTS.md.
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        const name = getStaticPropertyName(node)
        if (!name) return

        if (DISABLED_VERIFICATION.has(name)) {
          const value = getStaticValue(node.value, context.sourceCode.getScope(node.value))
          if (value?.value === false) {
            report(context, {
              node,
              messageId: 'verificationDisabled',
              data: { property: name },
              severity: 'high',
              confidence: 1,
            })
          }
          return
        }

        if (name === 'checkServerIdentity' && isFunction(node.value) && !containsThrow(node.value)) {
          report(context, {
            node,
            messageId: 'hostnameVerificationDisabled',
            data: { property: name },
            severity: 'high',
            confidence: 1,
          })
        }
      },
    }
  },
}

function isFunction(node) {
  return node?.type === 'ArrowFunctionExpression'
    || node?.type === 'FunctionExpression'
}

/**
 * A checkServerIdentity override that can never throw accepts every hostname.
 * Conservative in the safe direction: any throw anywhere in the body (even
 * behind conditions we do not model) counts as verifying.
 */
function containsThrow(node) {
  if (!node || typeof node !== 'object') return false
  if (node.type === 'ThrowStatement') return true

  for (const key of Object.keys(node)) {
    // `parent` points back up the tree; following it would loop forever.
    if (key === 'parent') continue
    const value = node[key]
    if (Array.isArray(value)) {
      if (value.some(containsThrow)) return true
    } else if (value && typeof value === 'object' && typeof value.type === 'string') {
      if (containsThrow(value)) return true
    }
  }

  return false
}
