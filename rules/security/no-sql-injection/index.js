const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, reportReachableSinks, settings, explainConfidence } = require('../../../machinery/security/finding')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into a raw SQL string (CWE-89, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: {
      sqlInjection: [
        'Possible SQL injection: untrusted input reaches {{sink}} as part of the query string.',
        'Flow: {{flow}}.',
        'Use the parameter channel instead of building the SQL string.',
      ].join(' '),
      sqlInjectionQualified: [
        'Possible SQL injection: untrusted input reaches {{sink}} as part of the query string.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Use the parameter channel instead of building the SQL string.',
      ].join(' '),
    },
    // No fix and no suggestion. Rewriting an interpolated query into a
    // parameterized one changes the argument list, the placeholder dialect
    // (`$1` / `?` / `:name`) and sometimes the method — it is not a mechanical
    // transformation, and a wrong "fix" to a security finding is worse than
    // none. See AGENTS.md.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        reportReachableSinks(context, analysis, node, 'sql', 'sqlInjection', 'sqlInjectionQualified')

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'sql') return

        const query = node.arguments[sink.argument]

        // A parameterized call leaves the SQL argument untainted, so
        // `db.query('... WHERE id = $1', [id])` needs no special case: the
        // taint is in argument 1, and argument 1 is not the sink.
        const taint = query && analysis.taintOf(query)
        if (!taint) return
        if (taint.sanitizedFor.has('sql') || taint.sanitizedFor.has('*')) return

        // The qualified message names the hops that cost confidence. With no
        // inexact hops there is nothing to name, and the template rendered as
        // "passes through ." — so fall back to the plain message rather than
        // emitting a sentence with a hole in it.
        const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

        report(context, {
          node: query,
          messageId: qualify ? 'sqlInjectionQualified' : 'sqlInjection',
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
  return `${sourceCode.getText(node.callee)}()`
}
