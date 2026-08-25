const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, reportReachableSinks, settings, explainConfidence } = require('../../../machinery/security/finding')

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
    messages: {
      clientOpenRedirect: [
        'Untrusted input reaches {{sink}}, which navigates the page.',
        'Flow: {{flow}}.',
        'Reject values with a scheme or a // prefix, or compare new URL(value, location.origin).origin against your own origin.',
      ].join(' '),
      clientOpenRedirectQualified: [
        'Untrusted input reaches {{sink}}, which navigates the page.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Reject values with a scheme or a // prefix, or compare new URL(value, location.origin).origin against your own origin.',
      ].join(' '),
    },
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

  const taint = analysis.taintOf(value)
  if (!taint) return
  if (taint.sanitizedFor.has('url') || taint.sanitizedFor.has('*')) return

  const label = context.sourceCode.getText(sinkLabelNode(value))
  const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

  report(context, {
    node: value,
    messageId: qualify ? 'clientOpenRedirectQualified' : 'clientOpenRedirect',
    data: { sink: label },
    severity: sink.severity,
    confidence: taint.confidence,
    path: [...taint.path, { node: value, kind: 'sink', label, penalty: 0 }],
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
