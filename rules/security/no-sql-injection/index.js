const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { reportReachableSinks, reportTaintedValue, taintMessages, callLabel, settings } = require('../../../machinery/security/finding')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into a raw SQL string (CWE-89, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: taintMessages(
      'sqlInjection',
      'Possible SQL injection: untrusted input reaches {{sink}} as part of the query string.',
      'Use the parameter channel instead of building the SQL string.',
    ),
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

        // A parameterized call leaves the SQL argument untainted, so
        // `db.query('... WHERE id = $1', [id])` needs no special case: the
        // taint is in argument 1, and argument 1 is not the sink.
        reportTaintedValue(context, analysis, {
          value: node.arguments[sink.argument],
          kind: 'sql',
          sink,
          label: callLabel(context.sourceCode, node),
          messageId: 'sqlInjection',
          qualifiedMessageId: 'sqlInjectionQualified',
        })
      },
    }
  },
}
