const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, callLabel, settings } = require('../../../machinery/security/finding')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into a shell command string (CWE-78, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'commandInjection',
      'Possible command injection: untrusted input reaches {{sink}}, which passes the string to a shell.',
      'Run the program through execFile or spawn with an argv array instead of building a shell string.',
    ),
    // No fix and no suggestion. Restructuring exec("git " + arg) into
    // execFile("git", [arg]) changes the call shape, argument splitting and
    // error handling; there is no mechanical transformation, and this is
    // exactly the security-sensitive code AGENTS.md forbids autofixing.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        reportReachableSinks(context, analysis, node, 'shell', 'commandInjection', 'commandInjectionQualified')

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'shell') return

        reportTaintedValue(context, analysis, {
          value: node.arguments[sink.argument],
          kind: 'shell',
          sink,
          label: callLabel(context.sourceCode, node),
          messageId: 'commandInjection',
          qualifiedMessageId: 'commandInjectionQualified',
        })
      },
    }
  },
}
