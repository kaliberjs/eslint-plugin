const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, callLabel, settings } = require('../../../machinery/security/finding')

// A redirect target built from request input sends the victim to an
// attacker-chosen origin — most damaging right after login, where the
// redirect carries an authenticated session. Two spellings are covered:
// redirect methods from the registry, and the raw Location header set
// through res.setHeader('Location', x).

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into server-side redirects (CWE-601, OWASP A01:2021)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'openRedirect',
      'Untrusted input reaches {{sink}}, which navigates the user to it.',
      'Compare the target against an allowlist of literal paths or hosts by equality; reject anything with a scheme or a // prefix (protocol-relative URLs are absolute to the browser).',
    ),
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        // Shared 'url' kind with security-no-ssrf — that rule owns the
        // outbound-request sinks (fetch, axios, http.get), this one owns
        // navigation, so the same call is never reported twice.
        reportReachableSinks(context, analysis, node, 'url', 'openRedirect', 'openRedirectQualified', isNavigationSink)

        const callee = node.callee

        // res.setHeader('Location', untrusted) — the header name only has to
        // be *provably* 'Location', not written as an inline literal: a
        // shared HEADER_LOCATION constant is ordinary code, not an evasion.
        if (callee.type === 'MemberExpression' && !callee.computed && callee.property?.name === 'setHeader' && node.arguments[0]) {
          const headerName = getStaticValue(node.arguments[0], context.sourceCode.getScope(node.arguments[0]))
          if (headerName && /^location$/i.test(String(headerName.value)))
            return emit(context, analysis, node.arguments[1], "res.setHeader('Location', …)")
        }

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'url' || !isNavigationSink(sink)) return

        emit(context, analysis, node.arguments[sink.argument], callLabel(context.sourceCode, node))
      },
    }
  },
}

// Severity is fixed at 'high' rather than taken from the sink: every
// navigation sink this rule owns is equally an open redirect.
function emit(context, analysis, value, label) {
  reportTaintedValue(context, analysis, {
    value,
    kind: 'url',
    label,
    severity: 'high',
    messageId: 'openRedirect',
    qualifiedMessageId: 'openRedirectQualified',
  })
}

function isNavigationSink(sink) {
  return !sink.id.startsWith('ssrf.')
}
