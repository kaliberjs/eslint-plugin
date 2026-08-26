const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, callLabel, settings } = require('../../../machinery/security/finding')

// A tainted path segment navigates out of the intended directory
// (`../../etc/passwd`) or addresses files the caller should never touch —
// CWE-22 covers both the read side (fs.readFile, res.sendFile) and the
// write side (fs.writeFile, multer destinations).

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into filesystem path arguments (CWE-22, OWASP A01:2021)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'pathTraversal',
      'Untrusted input reaches {{sink}} as part of a file path.',
      'Resolve the final path and assert it is inside the intended base directory (resolved.startsWith(base + path.sep)), or take path.basename() of untrusted segments.',
    ),
    // No fix: containment requires resolving and comparing against a base,
    // which depends on where the base lives.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        // Shared 'path' kind with no-firebase-path-injection — this rule
        // owns the filesystem sinks, that one owns its own, so the same
        // call is never reported twice under two different messages.
        reportReachableSinks(context, analysis, node, 'path', 'pathTraversal', 'pathTraversalQualified', sink => !sink.id.startsWith('firebase.'))

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'path') return
        if (sink.id.startsWith('firebase.')) return

        reportTaintedValue(context, analysis, {
          value: node.arguments[sink.argument],
          kind: 'path',
          sink,
          label: callLabel(context.sourceCode, node),
          messageId: 'pathTraversal',
          qualifiedMessageId: 'pathTraversalQualified',
        })
      },
    }
  },
}
