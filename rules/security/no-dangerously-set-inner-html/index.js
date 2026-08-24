const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings } = require('../../../machinery/security/finding')

// dangerouslySetInnerHTML is a deliberate hole in React's escaping. The
// constant-only form (icon sprites, static strings) is safe and common, so —
// unlike react/no-danger — the rule reserves its finding for non-constant
// values, which is where XSS actually lives. Sanitizer modelling (DOMPurify
// etc.) does not exist yet; until it does, a value that merely *passed
// through* a sanitizer is still flagged, which errs on the noisy side for
// one known false-positive family (JSON-LD built with JSON.stringify).
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use dangerouslySetInnerHTML with non-constant HTML (CWE-79)',
      url: docsUrl(__dirname),
    },
    messages: {
      nonConstantHtml: [
        'dangerouslySetInnerHTML receives a value that is not a constant.',
        'This bypasses React\'s escaping entirely: if the value ever contains attacker-influenced content, it becomes executable HTML.',
        'Sanitize at the assignment site with an allowlist-based sanitizer such as DOMPurify, and prefer rendering React nodes when possible.',
      ].join(' '),
    },
    // No fix: there is no mechanical rewrite of arbitrary HTML into
    // sanitized or React-rendered content.
    schema: [],
  },

  create(context) {
    // Sanitizer-aware: a value that passed through a registered `html`
    // sanitizer (settings['@kaliber/security'].registry.sanitizers — e.g.
    // DOMPurify, or the project's own trusted helper declared with
    // root.helper) is trusted even though it is not constant. The shared
    // analysis is cached per SourceCode, so this costs nothing extra.
    const options = settings(context)
    const analysis = analyze(context.sourceCode, options)

    return {
      JSXAttribute(node) {
        if (node.name?.name !== 'dangerouslySetInnerHTML') return

        const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value
        if (!value || !isObjectExpression(value)) return

        const htmlProperty = value.properties.find(
          property => property.type === 'Property' && !property.computed && property.key?.name === '__html'
        )
        if (!htmlProperty) return

        if (isConstant(htmlProperty.value)) return
        if (analysis.sanitizedAt(htmlProperty.value, 'html')) return

        report(context, {
          node,
          messageId: 'nonConstantHtml',
          severity: 'high',
          confidence: 0.6,
        })
      },

      CallExpression(node) {
        // React.createElement(tag, { dangerouslySetInnerHTML: { __html: x } })
        const props = node.arguments[1]
        if (!isObjectExpression(props)) return

        const dangerous = props.properties.find(
          property => property.type === 'Property' && !property.computed && property.key?.name === 'dangerouslySetInnerHTML'
        )

        if (!dangerous) return

        const inner = dangerous.value
        const htmlProperty = isObjectExpression(inner)
          ? inner.properties.find(
            property => property.type === 'Property' && !property.computed && property.key?.name === '__html'
          )
          : null

        if (!htmlProperty) return
        if (isConstant(htmlProperty.value)) return
        if (analysis.sanitizedAt(htmlProperty.value, 'html')) return

        report(context, {
          node: dangerous,
          messageId: 'nonConstantHtml',
          severity: 'high',
          confidence: 0.6,
        })
      },
    }
  },
}

function isObjectExpression(node) {
  return node?.type === 'ObjectExpression'
}

/**
 * A string literal, a template literal without expressions, or a template
 * whose expressions are themselves constants — enough to cover icon sprites
 * and static markup without pretending to understand string building.
 */
function isConstant(node) {
  if (!node) return false
  if (node.type === 'Literal') return true
  if (node.type === 'TemplateLiteral') return node.expressions.every(isConstant)
  return false
}
