const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings, explainConfidence } = require('../../../machinery/security/finding')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into DOM HTML-parser sinks (CWE-79, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: {
      domXss: [
        'Possible DOM XSS: untrusted input reaches {{sink}}, which parses it as HTML.',
        'Flow: {{flow}}.',
        'Use textContent, or sanitize with an allowlist-based sanitizer before assigning.',
      ].join(' '),
      domXssQualified: [
        'Possible DOM XSS: untrusted input reaches {{sink}}, which parses it as HTML.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Use textContent, or sanitize with an allowlist-based sanitizer before assigning.',
      ].join(' '),
    },
    // No fix: no mechanical rewrite of dynamic HTML exists. See AGENTS.md.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      AssignmentExpression(node) {
        if (node.operator !== '=' || node.left.type !== 'MemberExpression') return

        const sink = analysis.sinkAt(node.left)
        if (sink?.requires !== 'html') return

        reportTaint(context, analysis, node.right, sink, describeSink(context.sourceCode, node.left))
      },

      CallExpression(node) {
        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'html' || sink.argument === undefined) return

        const argument = node.arguments[sink.argument]
        if (!argument) return

        reportTaint(context, analysis, argument, sink, describeSink(context.sourceCode, node.callee))
      },
    }
  },
}

function reportTaint(context, analysis, value, sink, label) {
  const taint = value && analysis.taintOf(value)
  if (!taint) return
  if (taint.sanitizedFor.has('html') || taint.sanitizedFor.has('*')) return

  const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

  report(context, {
    node: value,
    messageId: qualify ? 'domXssQualified' : 'domXss',
    data: { sink: label },
    severity: sink.severity,
    confidence: taint.confidence,
    path: [...taint.path, { node: value, kind: 'sink', label, penalty: 0 }],
  })
}

function describeSink(sourceCode, node) {
  return sourceCode.getText(node)
}
