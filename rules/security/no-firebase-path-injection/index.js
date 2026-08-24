const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, reportReachableSinks, settings, explainConfidence } = require('../../../machinery/security/finding')

// Firebase Realtime Database and Firestore address data through a
// `/`-separated hierarchy, the same shape as a filesystem path. A tainted
// segment reaches beyond the subtree the caller was meant to see —
// db.ref(`users/${userId}/private`) with an attacker-chosen userId
// containing `/` addresses a different user entirely, and on the admin
// SDK specifically this bypasses whatever Realtime Database / Firestore
// security rules exist, because the admin SDK is not subject to them.
// Kept separate from no-path-traversal even though both share the CWE and
// the 'path' taint kind: the remediation text differs (there is no
// resolve-then-check-base-directory equivalent for a database path), and
// a project without Firebase should not need to think about this rule.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into Firebase Realtime Database / Firestore path arguments (CWE-22, OWASP A01:2021)',
      url: docsUrl(__dirname),
    },
    messages: {
      firebasePathInjection: [
        'Untrusted input reaches {{sink}} as part of a database path.',
        'Flow: {{flow}}.',
        "A '/' in the value addresses a different node or document than intended — on the admin SDK, one not subject to your Realtime Database / Firestore security rules at all.",
        'Validate the value against an allowlist, or reject any value containing a slash.',
      ].join(' '),
      firebasePathInjectionQualified: [
        'Untrusted input reaches {{sink}} as part of a database path.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        "A '/' in the value addresses a different node or document than intended — on the admin SDK, one not subject to your Realtime Database / Firestore security rules at all.",
        'Validate the value against an allowlist, or reject any value containing a slash.',
      ].join(' '),
    },
    // No fix: the correct validation (an allowlist of known IDs, or a
    // reject-on-slash check) is application knowledge.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        // Shared with no-path-traversal's filesystem sinks — only report
        // the ones this rule actually owns.
        reportReachableSinks(context, analysis, node, 'path', 'firebasePathInjection', 'firebasePathInjectionQualified', sink => sink.id.startsWith('firebase.'))

        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'path') return
        if (!sink.id.startsWith('firebase.')) return

        const target = node.arguments[sink.argument]

        const taint = target && analysis.taintOf(target)
        if (!taint) return
        if (taint.sanitizedFor.has('path') || taint.sanitizedFor.has('*')) return

        const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)

        report(context, {
          node: target,
          messageId: qualify ? 'firebasePathInjectionQualified' : 'firebasePathInjection',
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
