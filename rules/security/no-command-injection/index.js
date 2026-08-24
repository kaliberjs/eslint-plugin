const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings, explainConfidence } = require('../../../machinery/security/finding')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into a shell command string (CWE-78, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: {
      commandInjection: [
        'Possible command injection: untrusted input reaches {{sink}}, which passes the string to a shell.',
        'Flow: {{flow}}.',
        'Run the program through execFile or spawn with an argv array instead of building a shell string.',
      ].join(' '),
      commandInjectionQualified: [
        'Possible command injection: untrusted input reaches {{sink}}, which passes the string to a shell.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Run the program through execFile or spawn with an argv array instead of building a shell string.',
      ].join(' '),
    },
    // No fix and no suggestion. Restructuring exec("git " + arg) into
    // execFile("git", [arg]) changes the call shape, argument splitting and
    // error handling; there is no mechanical transformation, and this is
    // exactly the security-sensitive code AGENTS.md forbids autofixing.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options)

    return {
      CallExpression(node) {
        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'shell') return

        const command = node.arguments[sink.argument]

        const taint = command && analysis.taintOf(command)
        if (!taint) return
        if (taint.sanitizedFor.has('shell') || taint.sanitizedFor.has('*')) return

        const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

        report(context, {
          node: command,
          messageId: qualify ? 'commandInjectionQualified' : 'commandInjection',
          data: { sink: describeSink(context.sourceCode, node) },
          severity: sink.severity,
          confidence: taint.confidence,
          path: [...taint.path, { node, kind: 'sink', label: describeSink(context.sourceCode, node), penalty: 0 }],
        })
      },
    }
  },
}

function describeSink(sourceCode, node) {
  const callee = node.callee
  return callee.type === 'Identifier' ? `${callee.name}()` : `${sourceCode.getText(callee)}()`
}
