const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings, explainConfidence } = require('../../../machinery/security/finding')

// ESLint core's no-eval, no-implied-eval and no-new-func (all enabled in the
// shared config) cover eval, new Function and string-bodied timers. This rule
// is deliberately about what those miss: the vm module's code-compilation
// entry points. Two tiers, per the research plan:
//
//   tainted argument  -> high severity finding with the flow path
//   dynamic, untainted -> medium severity: code assembled at runtime from
//                         config is how vm usage goes wrong slowly
//   static literal     -> silent; evaluating a fixed snippet is not a finding
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect untrusted input flowing into vm module code compilation (CWE-95, OWASP A03:2021-Injection)',
      url: docsUrl(__dirname),
    },
    messages: {
      codeInjection: [
        'Untrusted input reaches {{sink}}, which compiles it as executable code.',
        'Flow: {{flow}}.',
        'There is no safe way to run attacker-influenced code: restructure to data-driven logic instead.',
      ].join(' '),
      codeInjectionQualified: [
        'Untrusted input reaches {{sink}}, which compiles it as executable code.',
        'Flow: {{flow}}.',
        'Confidence is {{confidence}} because the value passes through {{why}}.',
        'There is no safe way to run attacker-influenced code: restructure to data-driven logic instead.',
      ].join(' '),
      dynamicCode: [
        '{{sink}} receives a value that was built at runtime.',
        'Whatever assembles it today, this is an arbitrary-code execution entry point one refactor away from receiving user input.',
        'Prefer data-driven dispatch (a lookup table of known functions) over building source strings.',
      ].join(' '),
    },
    // No fix: there is no mechanical replacement for dynamic evaluation.
    schema: [],
  },

  create(context) {
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      CallExpression(node) {
        const sink = analysis.sinkAt(node)
        if (sink?.requires !== 'code') return

        const code = node.arguments[sink.argument]
        if (!code) return

        const taint = analysis.taintOf(code)
        if (taint && !taint.sanitizedFor.has('code') && !taint.sanitizedFor.has('*')) {
          const qualify = taint.confidence < 0.8 && explainConfidence(taint.path)
          report(context, {
            node: code,
            messageId: qualify ? 'codeInjectionQualified' : 'codeInjection',
            data: { sink: describeSink(context.sourceCode, node.callee) },
            severity: sink.severity,
            confidence: taint.confidence,
            path: [...taint.path, { node: code, kind: 'sink', label: describeSink(context.sourceCode, node.callee), penalty: 0 }],
          })
          return
        }

        if (!getStaticValue(code, context.sourceCode.getScope(code))) {
          report(context, {
            node: code,
            messageId: 'dynamicCode',
            data: { sink: describeSink(context.sourceCode, node.callee) },
            severity: 'medium',
            confidence: 1,
          })
        }
      },
    }
  },
}

function describeSink(sourceCode, node) {
  return sourceCode.getText(node)
}
