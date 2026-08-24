const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Logging req.headers wholesale prints Authorization, Cookie, X-Api-Key and
// Proxy-Authorization — every credential the client sent — into the log
// stream, where retention and access are usually much wider than the
// application itself. The slice below is deliberately syntactic: a known
// request object's headers or cookies passed to something that logs.
const LOGGER_METHODS = new Set(['log', 'info', 'warn', 'error', 'debug', 'trace', 'fatal'])

const REQUEST_ROOTS = new Set(['req', 'request', 'event'])

const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'x-api-key'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not log request credentials (headers, cookies) wholesale (CWE-532)',
      url: docsUrl(__dirname),
    },
    messages: {
      credentialLog: [
        'Logging {{ expression }} writes credentials (Authorization, Cookie, API keys) into the log stream.',
        'Logs typically have far wider read access and longer retention than the application.',
        'Log a named subset of non-sensitive headers instead.',
      ].join(' '),
    },
    // No fix: which headers may be logged is a per-application decision.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const isLoggerCall = callee.type === 'MemberExpression'
          && !callee.computed
          && LOGGER_METHODS.has(callee.property.name ?? '')

        if (!isLoggerCall) return

        for (const arg of node.arguments) {
          const leak = walkForCredential(arg)
          if (!leak) continue

          report(context, {
            node: leak,
            messageId: 'credentialLog',
            data: { expression: oneLine(context, leak) },
            severity: 'medium',
            confidence: 1,
          })
        }
      },
    }
  },
}

/**
 * Matches:
 *   req.headers / request.headers / event.headers   — wholesale
 *   req.cookies                                     — wholesale
 *   headers.authorization / headers['x-api-key']    — a single credential
 *
 * Also found when wrapped one or more levels deep — JSON.stringify(event.headers),
 * a template literal, an object literal passed to the logger. The wrapper does
 * not keep credentials out of the log stream.
 */
function walkForCredential(node) {
  if (!node || typeof node.type !== 'string') return null

  if (node.type === 'MemberExpression') {
    const match = matchesCredentialAccess(node)
    if (match) return match
  }

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const value = node[key]
    const candidates = Array.isArray(value) ? value : [value]
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue
      if (typeof candidate.type !== 'string') continue
      const found = walkForCredential(candidate)
      if (found) return found
    }
  }

  return null
}

function matchesCredentialAccess(node) {
  const chain = memberChain(node)
  if (!Array.isArray(chain) || !chain.length) return null

  const last = chain[chain.length - 1].toLowerCase()

  // A sensitive header read off a headers object: `req.headers.authorization`,
  // `headers['x-api-key']`. Flagged regardless of the root object name.
  if (SENSITIVE_HEADERS.has(last) && chain.length >= 2 && chain[chain.length - 2] === 'headers') return node

  // Wholesale logging of headers or cookies on a known request-ish root.
  if ((last === 'headers' || last === 'cookies') && chain.some(isRequestRoot)) return node

  return null
}

function isRequestRoot(name) {
  return REQUEST_ROOTS.has(name) || name === 'ctx'
}

/** Property names from the root outwards; stops at anything non-member. */
function memberChain(node) {
  const parts = []
  let current = node

  while (current?.type === 'MemberExpression') {
    if (current.computed) {
      if (current.property?.type !== 'Literal' || typeof current.property.value !== 'string') return []
      parts.push(String(current.property.value))
    } else {
      if (current.property?.type !== 'Identifier') return []
      parts.push(current.property.name)
    }
    current = current.object
  }

  if (current?.type !== 'Identifier') return null
  return [current.name, ...parts.reverse()]
}

function oneLine(context, node) {
  return context.sourceCode.getText(node).replace(/\s+/g, ' ')
}
