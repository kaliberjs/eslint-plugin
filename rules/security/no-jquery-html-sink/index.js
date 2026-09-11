const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { NAME_ONLY_CONFIDENCE } = require('../../../machinery/security/provenance')

// jQuery treats strings starting with '<' as HTML rather than selectors, and
// its .html() family parses markup. Non-literal arguments are the jQuery-era
// XSS. Selectors are the false-positive trap, so bare $(x) is deliberately
// out of scope — only the methods that always parse HTML are matched.
//
// Audit-only, and matched by method name: jQuery is routinely a `<script>`
// global with no import to resolve, and `append`/`before`/`after` are names
// any collection API may use. So the receiver is never proven, confidence is
// capped at medium, and the message asks for a read rather than declaring a
// vulnerability.

const HTML_SINKS = new Set(['html', 'append', 'prepend', 'after', 'before', 'replaceWith', 'wrap', 'parseHTML'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not pass non-literal values to jQuery APIs that parse HTML (CWE-79)',
      url: docsUrl(__dirname),
    },
    messages: {
      jqueryHtmlSink: [
        'Audit this non-constant value: if this is jQuery, {{ method }}() parses its argument as HTML.',
        'The receiver is matched by method name only, and nothing here traces where the value comes from — both are yours to confirm.',
        'Build DOM nodes programmatically or use .text() for plain content.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return

        const method = String(callee.property?.name ?? '')
        if (!HTML_SINKS.has(method)) return

        const argument = node.arguments[0]
        if (!argument) return
        // Folded through getStaticValue rather than checking Literal/
        // TemplateLiteral node types directly: a const alias of either is
        // exactly as static, and treating it as "not a literal" made this
        // a false positive on demonstrably safe code.
        if (getStaticValue(argument, context.sourceCode.getScope(argument))) return

        report(context, {
          node,
          messageId: 'jqueryHtmlSink',
          data: { method },
          severity: 'medium',
          confidence: NAME_ONLY_CONFIDENCE,
        })
      },
    }
  },
}
