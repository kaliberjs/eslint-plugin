const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, settings } = require('../../../machinery/security/finding')

// Client-side variant: browser sources (location.*, document.URL) navigating
// the page or its router. Same weakness as security-no-open-redirect,
// different sinks — kept separate so server and client adoption can differ.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into client-side navigation (CWE-601)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'clientOpenRedirect',
      'Untrusted input reaches {{sink}}, which navigates the page.',
      'Reject values with a scheme or a // prefix, or compare new URL(value, location.origin).origin against your own origin.',
    ),
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        // Shared 'url' kind with security-no-ssrf, which owns the
        // outbound-request sinks (fetch, axios, http.get). Navigation only
        // here, so a call is never reported under two messages.
        reportReachableSinks(context, analysis, node, 'url', 'clientOpenRedirect', 'clientOpenRedirectQualified', isNavigationSink)

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'url' || !isNavigationSink(sink)) return

        reportTaint(context, analysis, node.arguments[sink.argument], sink)
      },

      AssignmentExpression(node) {
        if (node.operator !== '=' || node.left?.type !== 'MemberExpression') return

        const sink = analysis.sinkAt(node.left)
        if (sink?.requires !== 'url') return

        reportTaint(context, analysis, node.right, sink)
      },
    }
  },
}

function reportTaint(context, analysis, value, sink) {
  if (!value) return

  reportTaintedValue(context, analysis, {
    value,
    kind: 'url',
    sink,
    label: context.sourceCode.getText(sinkLabelNode(value)),
    messageId: 'clientOpenRedirect',
    qualifiedMessageId: 'clientOpenRedirectQualified',
  })
}

function isNavigationSink(sink) {
  return !sink.id.startsWith('ssrf.')
}

/** The assignment target or call callee — what the flow reaches. */
function sinkLabelNode(value) {
  let current = value
  while (current.parent) {
    const parent = current.parent
    if (parent.type === 'AssignmentExpression') return parent.left
    if (parent.type === 'CallExpression') return parent.callee
    current = parent
  }
  return value
}
