const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings, explainConfidence } = require('../../../machinery/security/finding')

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
    messages: {
      pathTraversal: [
        'Untrusted input reaches {{sink}} as part of a file path.',
        'Flow: {{flow}}.',
        'Resolve the final path and assert it is inside the intended base directory (resolved.startsWith(base + path.sep)), or take path.basename() of untrusted segments.',
      ].join(' '),
      pathTraversalQualified: [
        'Untrusted input reaches {{sink}} as part of a file path.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Resolve the final path and assert it is inside the intended base directory (resolved.startsWith(base + path.sep)), or take path.basename() of untrusted segments.',
      ].join(' '),
    },
    // No fix: containment requires resolving and comparing against a base,
    // which depends on where the base lives.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options)

    return {
      CallExpression(node) {
        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'path') return

        const target = node.arguments[sink.argument]

        const taint = target && analysis.taintOf(target)
        if (!taint) return
        if (taint.sanitizedFor.has('path') || taint.sanitizedFor.has('*')) return

        const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

        report(context, {
          node: target,
          messageId: qualify ? 'pathTraversalQualified' : 'pathTraversal',
          data: { sink: describeSink(context.sourceCode, node.callee) },
          severity: sink.severity,
          confidence: taint.confidence,
          path: [...taint.path, { node, kind: 'sink', label: describeSink(context.sourceCode, node.callee), penalty: 0 }],
        })
      },
    }
  },
}

function describeSink(sourceCode, node) {
  return `${sourceCode.getText(node)}()`
}
