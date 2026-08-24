const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings, explainConfidence } = require('../../../machinery/security/finding')

// A redirect target built from request input sends the victim to an
// attacker-chosen origin — most damaging right after login, where the
// redirect carries an authenticated session. Two spellings are covered:
// redirect methods from the registry, and the raw Location header set
// through res.setHeader('Location', x).

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into server-side redirects (CWE-601, OWASP A01:2021)',
      url: docsUrl(__dirname),
    },
    messages: {
      openRedirect: [
        'Untrusted input reaches {{sink}}, which navigates the user to it.',
        'Flow: {{flow}}.',
        'Compare the target against an allowlist of literal paths or hosts by equality; reject anything with a scheme or a // prefix (protocol-relative URLs are absolute to the browser).',
      ].join(' '),
      openRedirectQualified: [
        'Untrusted input reaches {{sink}}, which navigates the user to it.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'Compare the target against an allowlist of literal paths or hosts by equality; reject anything with a scheme or a // prefix (protocol-relative URLs are absolute to the browser).',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options)

    return {
      CallExpression(node) {
        const callee = node.callee

        // res.setHeader('Location', untrusted)
        if (
          callee.type === 'MemberExpression'
          && !callee.computed
          && callee.property?.name === 'setHeader'
          && node.arguments[0]?.type === 'Literal'
          && /^location$/i.test(String(node.arguments[0].value))
        ) {
          return emit(context, analysis, node.arguments[1], "res.setHeader('Location', …)")
        }

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'url') return

        emit(context, analysis, node.arguments[sink.argument], describeSink(context.sourceCode, callee))
      },
    }
  },
}

function emit(context, analysis, value, label) {
  if (!value) return

  const taint = analysis.taintOf(value)
  if (!taint) return
  if (taint.sanitizedFor.has('url') || taint.sanitizedFor.has('*')) return

  const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

  report(context, {
    node: value,
    messageId: qualify ? 'openRedirectQualified' : 'openRedirect',
    data: { sink: label },
    severity: 'high',
    confidence: taint.confidence,
    path: [...taint.path, { node: value, kind: 'sink', label, penalty: 0 }],
  })
}

function describeSink(sourceCode, callee) {
  return `${sourceCode.getText(callee)}()`
}
