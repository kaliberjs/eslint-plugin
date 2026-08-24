const { getStaticValue, findVariable } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Fires only on cookies whose name matches a session/auth pattern, per the
// research entry: CSRF tokens and preference cookies are legitimately
// script-readable and non-secure, and flagging them is the noise that kills
// the rule. The pattern list is deliberately narrow.
//
// Two call shapes, same option object and same flags: res.cookie() is the
// Express convention, but a real auth flow just as often builds the
// Set-Cookie header value directly with the standalone `cookie` package
// (cookie.serialize(name, value, options) — identical argument order) and
// sets it on a plain response object this rule cannot see the shape of.
// Matching only res.cookie() left that flow structurally invisible.

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

        const isResCookie = /^(res|response)$/i.test(String(callee.object?.name ?? '')) && callee.property?.name === 'cookie'
        const isCookieSerialize = callee.property?.name === 'serialize' && isCookiePackage(context, callee.object)
        if (!isResCookie && !isCookieSerialize) return

        const cookieName = node.arguments[0]
        if (!isSessionCookie(context, cookieName)) return

        const options = findOptionsObject(node.arguments.slice(2))
        const problems = collectProblems(options, context, isResCookie)
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

/**
 * `cookie.serialize(...)` only counts when `cookie` is provably the
 * standalone `cookie` package — a receiver-name match alone would collide
 * with any unrelated local variable happening to be called `cookie`, which
 * a package this generically named makes more likely than most.
 */
function isCookiePackage(context, object) {
  if (object?.type !== 'Identifier') return false

  const variable = findVariable(context.sourceCode.getScope(object), object)
  const definition = variable?.defs[0]
  if (!definition) return false

  if (definition.type === 'ImportBinding') return definition.parent.source.value === 'cookie'

  if (definition.type === 'Variable') {
    const init = definition.node.init
    return init?.type === 'CallExpression'
      && init.callee?.type === 'Identifier' && init.callee.name === 'require'
      && init.arguments[0]?.type === 'Literal' && init.arguments[0].value === 'cookie'
  }

  return false
}

function isSessionCookie(context, argument) {
  if (!argument) return false
  // Folded through getStaticValue rather than requiring an inline Literal:
  // a top-level const cookie name (DEBUG_PANEL_COOKIE_OPEN-style — the
  // ordinary way to name a cookie once, not repeat the string at every
  // call site) is exactly as identifiable as the string itself.
  const value = getStaticValue(argument, context.sourceCode.getScope(argument))
  return typeof value?.value === 'string' && SESSION_COOKIE.test(value.value)
}

function findOptionsObject(args) {
  return args.find(arg => arg.type === 'ObjectExpression') ?? null
}

function collectProblems(options, context, isResCookie) {
  // No options object at all: neither Express's res.cookie() nor the
  // standalone cookie package sets secure/httpOnly/sameSite unless told to.
  if (!options) {
    return isResCookie
      ? ['without an options object — it will default to secure: false']
      : ['without an options object — secure, httpOnly and sameSite all default to unset']
  }

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
