const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { getCalleeName } = require('../../../machinery/ast')

// localStorage/sessionStorage is readable by every script on the page —
// including anything from a compromised third-party tag. Tokens and session
// material belong in httpOnly cookies; this rule fires when credential-shaped
// keys are stored web-side. Key names gate the rule: flagging every
// localStorage write would be the noise that kills it.

const CREDENTIAL_KEY = /token|secret|password|passwd|jwt|auth|session|apikey|api[-_]key|credential|refresh/i

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not store credentials or session material in web storage (CWE-922)',
      url: docsUrl(__dirname),
    },
    messages: {
      credentialInStorage: [
        "A credential-shaped key ('{{ key }}') is written to {{ storage }}.",
        'Web storage is readable by every script running on the page, so one XSS exfiltrates it.',
        'Keep session material in httpOnly cookies; keep at most a short-lived reference client-side.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      'CallExpression[arguments.length=2]'(node) {
        const name = getCalleeName(node.callee)
        if (name !== 'setItem') return

        const root = getStorageRoot(node.callee)
        if (!root) return

        const key = node.arguments[0]
        const staticKey = key && getStaticValue(key, context.sourceCode.getScope(key))
        if (typeof staticKey?.value === 'string' && CREDENTIAL_KEY.test(staticKey.value)) {
          emit(context, key, staticKey.value, root)
        }
      },

      AssignmentExpression(node) {
        const target = node.left
        if (target?.type !== 'MemberExpression') return

        const root = getStorageRoot(target)
        if (!root) return

        // localStorage.authToken = x
        const key = target.computed
          ? (target.property?.type === 'Literal' ? String(target.property.value) : null)
          : String(target.property?.name ?? '')

        if (key && CREDENTIAL_KEY.test(key)) {
          emit(context, target, key, root)
        }
      },
    }
  },
}

function getStorageRoot(calleeOrTarget) {
  let current = calleeOrTarget?.object ?? calleeOrTarget
  let storageName = null

  // Any segment named *Storage qualifies: localStorage, sessionStorage,
  // reached directly or through window.
  while (current?.type === 'MemberExpression') {
    if (!current.computed && /storage$/i.test(String(current.property?.name ?? ''))) storageName = current.property.name
    current = current.object
  }

  if (current?.type === 'Identifier' && /storage$/i.test(current.name)) storageName = current.name
  return storageName
}

function emit(context, node, key, storage) {
  report(context, {
    node,
    messageId: 'credentialInStorage',
    data: { key, storage },
    severity: 'medium',
    confidence: 1,
  })
}
