const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// jQuery treats strings starting with '<' as HTML rather than selectors, and
// its .html() family parses markup. Non-literal arguments are the jQuery-era
// XSS. Selectors are the false-positive trap, so bare $(x) is deliberately
// out of scope — only the methods that always parse HTML are matched.

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
        '{{ method }}() parses its argument as HTML.',
        'If the value is ever attacker-influenced, it becomes executable markup inside the page.',
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
        if (!argument || argument.type === 'Literal') return
        if (argument.type === 'TemplateLiteral' && !argument.expressions.length) return

        report(context, {
          node,
          messageId: 'jqueryHtmlSink',
          data: { method },
          severity: 'medium',
          confidence: 1,
        })
      },
    }
  },
}
