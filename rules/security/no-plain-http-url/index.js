const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Cleartext HTTP exposes credentials, tokens and response bodies to any
// network observer. The slice is literal URLs only — a variable holding a
// scheme is invisible to us and saying otherwise would be a lie.

const REQUEST_APIS = new Set([
  'fetch', 'get', 'post', 'put', 'patch', 'delete', 'head', 'request',
  'open', 'send', 'connect', 'download', 'getImage',
])

const SAFE_HOSTS = /^\w+:\/{2}(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])([:/\s]|$)/i

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not request cleartext http:// or ws:// endpoints (CWE-319)',
      url: docsUrl(__dirname),
    },
    messages: {
      cleartextRequest: [
        "A request is made to a cleartext '{{ scheme }}' endpoint.",
        'Credentials, tokens and response bodies are readable and modifiable by any network observer.',
        'Use https:// / wss://; allow localhost explicitly during development.',
      ].join(' '),
    },
    // No autofix: the https endpoint may not exist yet.
    schema: [],
  },

  create(context) {
    return {
      Literal(node) {
        const value = node.value
        if (typeof value !== 'string') return
        const match = /^http:\/\//i.exec(value)
          || (/^ws:\/\//i.test(value) ? { 1: 'ws' } : null)
        if (!match) return
        if (SAFE_HOSTS.test(value)) return

        const parent = node.parent

        // Passed as an argument: fetch('http://…'), axios.get(...),
        // new WebSocket('ws://…') — constructor calls included.
        if ((parent?.type === 'CallExpression' || parent?.type === 'NewExpression') && parent.arguments.includes(node)) {
          const name = getCalleeName(parent.callee)
          if (REQUEST_APIS.has(name ?? '')) return reportCleartext(context, node, match[1])
          if (name === 'WebSocket') return reportCleartext(context, node, match[1])
        }

        // Assigned into an option shape: { url: 'http://…' }, { baseURL }.
        if (parent?.type === 'Property') {
          const key = String(parent.key?.name ?? parent.key?.value ?? '')
          if (/^(url|uri|baseurl|endpoint|href|src|host)$/i.test(key)) return reportCleartext(context, node, match[1])
        }
      },
    }
  },
}

function getCalleeName(callee) {
  if (!callee) return null
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}

function reportCleartext(context, node, scheme) {
  report(context, {
    node,
    messageId: 'cleartextRequest',
    data: { scheme },
    severity: 'medium',
    confidence: 1,
  })
}
