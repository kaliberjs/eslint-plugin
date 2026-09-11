const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, settings } = require('../../../machinery/security/finding')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into DOM HTML-parser sinks (CWE-79, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'domXss',
      'Possible DOM XSS: untrusted input reaches {{sink}}, which parses it as HTML.',
      'Use textContent, or sanitize with an allowlist-based sanitizer before assigning.',
    ),
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

        reportTaint(context, analysis, node.right, sink, context.sourceCode.getText(node.left))
      },

      CallExpression(node) {
        reportReachableSinks(context, analysis, node, 'html', 'domXss', 'domXssQualified')

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'html' || sink.argument === undefined) return

        const argument = node.arguments[sink.argument]
        if (!argument) return

        reportTaint(context, analysis, argument, sink, context.sourceCode.getText(node.callee))
      },
    }
  },
}

function reportTaint(context, analysis, value, sink, label) {
  reportTaintedValue(context, analysis, {
    value,
    kind: 'html',
    sink,
    label,
    messageId: 'domXss',
    qualifiedMessageId: 'domXssQualified',
  })
}
