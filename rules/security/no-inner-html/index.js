const { getStaticValue, getPropertyName } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { NAME_ONLY_CONFIDENCE } = require('../../../machinery/security/provenance')

// innerHTML, outerHTML, insertAdjacentHTML and document.write all invoke the
// HTML parser. A non-literal value reaching any of them is the DOM form of
// the XSS that dangerouslySetInnerHTML is on the React side — same rule
// shape: constants stay quiet, everything else is flagged.
//
// This is an audit rule, not a vulnerability rule. It establishes only that
// the value is not a constant; it traces nothing and proves no attacker
// influence, so it reports at medium confidence and its message asks for a
// read rather than declaring a bug. security-no-dom-xss-sink is the rule that
// reports a traced flow into these same sinks, and it is the one in the
// default preset.
//
// textContent is the safe alternative and deliberately absent from this list.
const SINK_PROPERTIES = new Set(['innerHTML', 'outerHTML'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not assign non-literal values to HTML-parser entry points (CWE-79)',
      url: docsUrl(__dirname),
    },
    messages: {
      htmlSink: [
        'Audit this non-constant value: {{ sink }} parses whatever it receives as HTML.',
        'Nothing here establishes where the value comes from — if it can carry attacker-influenced content, it becomes executable markup.',
        'Prefer textContent for text; sanitize with an allowlist-based sanitizer such as DOMPurify when HTML is genuinely required.',
      ].join(' '),
    },
    // No fix: there is no mechanical rewrite of arbitrary HTML into safe
    // content. See AGENTS.md.
    schema: [],
  },

  create(context) {
    return {
      AssignmentExpression(node) {
        if (node.operator !== '=' || node.left.type !== 'MemberExpression') return

        const name = getPropertyName(node.left, context.sourceCode.getScope(node.left))
        if (name === null || !SINK_PROPERTIES.has(String(name))) return
        if (isConstant(context, node.right)) return

        report(context, {
          node,
          messageId: 'htmlSink',
          data: { sink: String(name) },
          severity: 'medium',
          confidence: NAME_ONLY_CONFIDENCE,
        })
      },

      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return

        const name = callee.property.name

        if (name === 'insertAdjacentHTML') {
          const html = node.arguments[1]
          if (html && !isConstant(context, html)) {
            report(context, { node: html, messageId: 'htmlSink', data: { sink: 'insertAdjacentHTML' }, severity: 'medium', confidence: NAME_ONLY_CONFIDENCE })
          }
          return
        }

        if ((name === 'write' || name === 'writeln') && isDocument(callee.object)) {
          const html = node.arguments[0]
          if (html && !isConstant(context, html)) {
            report(context, { node: html, messageId: 'htmlSink', data: { sink: `document.${name}` }, severity: 'medium', confidence: NAME_ONLY_CONFIDENCE })
          }
        }
      },
    }
  },
}

function isDocument(node) {
  if (node?.type === 'Identifier') return /^(document|doc)$/.test(node.name)
  return node?.type === 'MemberExpression'
    && node.property?.type === 'Identifier'
    && node.property.name === 'document'
}

/**
 * Anything that folds to a static value at parse time cannot carry a payload:
 * string literals, no-substitution templates, pure-literal concatenation.
 */
function isConstant(context, node) {
  return Boolean(getStaticValue(node, context.sourceCode.getScope(node)))
}
