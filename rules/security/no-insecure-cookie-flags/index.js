const { getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Fires only on cookies whose name matches a session/auth pattern, per the
// research entry: CSRF tokens and preference cookies are legitimately
// script-readable and non-secure, and flagging them is the noise that kills
// the rule. The pattern list is deliberately narrow.

const SESSION_COOKIE = /^(sess|session|auth|token|jwt|sid|sessionid|refresh[-_]?token|access[-_]?token|connect\.sid)/i

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Session and authentication cookies must be Secure, HttpOnly, and not SameSite=None without Secure (CWE-614, CWE-1004)',
      url: docsUrl(__dirname),
    },
    messages: {
      insecureCookie: [
        "The session cookie '{{ name }}' is set {{ problem }}.",
        'Without these flags the cookie can travel over plaintext or be read by any script in the page.',
        "Set secure: true, httpOnly: true, and sameSite: 'lax' or 'strict'.",
      ].join(' '),
    },
    // No fix: flags depend on deployment topology (TLS termination etc.).
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return
        // Receiver-constrained: res.cookie / response.cookie. A generic
        // `.cookie()` on any object would fire on test fixtures and cookie
        // libraries that have nothing to do with HTTP responses.
        if (!/^(res|response)$/i.test(String(callee.object?.name ?? ''))) return
        if (callee.property?.name !== 'cookie') return

        const cookieName = node.arguments[0]
        if (!isSessionCookie(cookieName)) return

        const options = findOptionsObject(node.arguments.slice(2))
        const problems = collectProblems(options, context)
        if (!problems.length) return

        report(context, {
          node,
          messageId: 'insecureCookie',
          data: { name: text(context, cookieName), problem: problems.join(', ') },
          severity: 'medium',
          confidence: 1,
        })
      },
    }
  },
}

function isSessionCookie(argument) {
  return argument?.type === 'Literal'
    && typeof argument.value === 'string'
    && SESSION_COOKIE.test(argument.value)
}

function findOptionsObject(args) {
  return args.find(arg => arg.type === 'ObjectExpression') ?? null
}

function collectProblems(options, context) {
  // No options object at all: express defaults secure to false.
  if (!options) return ['without an options object — it will default to secure: false']

  const get = key => options.properties.find(
    property => property.type === 'Property' && getStaticPropertyName(property) === key
  )
  const valueOf = property => property && getStaticValue(property.value, context.sourceCode.getScope(property.value))

  const problems = []
  const secure = valueOf(get('secure'))
  const httpOnly = valueOf(get('httpOnly'))
  const sameSite = valueOf(get('sameSite'))

  if (secure?.value === false) problems.push('with secure: false')
  if (httpOnly?.value === false) problems.push('with httpOnly: false')
  if (
    sameSite && String(sameSite.value).toLowerCase() === 'none'
    && secure?.value !== true
  ) problems.push("with sameSite: 'none' but no secure: true")

  return problems
}

function text(context, node) {
  return context.sourceCode.getText(node)
}
