const { findVariable, getPropertyName } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { analyze } = require('../../../machinery/security/taint')
const { report, settings } = require('../../../machinery/security/finding')

// dangerouslySetInnerHTML is a deliberate hole in React's escaping. The
// constant-only form (icon sprites, static strings) is safe and common, so —
// unlike react/no-danger — the rule reserves its finding for non-constant
// values, which is where XSS actually lives. A value that passed through a
// registered `html` sanitizer (settings['@kaliber/security'].registry.sanitizers
// — e.g. the project's own trusted helper declared with root.helper) is
// trusted too, including when the sanitizer call is one interpolation
// inside an otherwise-static template literal — the JSON-in-script-tag
// shape (structured data, analytics dataLayer pushes) almost always looks
// like that, not a bare sanitizer call.
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
    const analysis = analyze(context.sourceCode, options, context.filename)

    return {
      JSXAttribute(node) {
        if (node.name?.name !== 'dangerouslySetInnerHTML') return

        const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value
        const htmlValue = findProperty(value, '__html', context.sourceCode)
        if (!htmlValue) return

        if (isSafe(analysis, htmlValue)) return

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
        const inner = findProperty(props, 'dangerouslySetInnerHTML', context.sourceCode)
        if (!inner) return

        const htmlValue = findProperty(inner, '__html', context.sourceCode)
        if (!htmlValue) return

        if (isSafe(analysis, htmlValue)) return

        report(context, {
          node: inner,
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
 * Resolve an identifier to the object literal it was declared with — the
 * props object is routinely extracted to a variable before being spread
 * onto the attribute, and that is not an evasion, just ordinary style.
 * One hop only: a chain of intermediate aliases is not chased.
 */
function resolveObjectExpression(node, sourceCode) {
  if (isObjectExpression(node)) return node
  if (node?.type !== 'Identifier') return null

  const variable = findVariable(sourceCode.getScope(node), node)
  const definition = variable?.defs[0]
  if (definition?.type !== 'Variable') return null

  return isObjectExpression(definition.node.init) ? definition.node.init : null
}

/**
 * Find a named property's value inside an object expression (or an
 * identifier bound to one), descending through `...spread` so that
 * `{ ...markup }` does not hide `__html` from the check the same way an
 * inline property would not.
 */
function findProperty(node, name, sourceCode) {
  const objectExpression = resolveObjectExpression(node, sourceCode)
  if (!objectExpression) return null

  for (const property of objectExpression.properties) {
    if (property.type === 'SpreadElement') {
      const found = findProperty(property.argument, name, sourceCode)
      if (found) return found
      continue
    }

    if (property.type === 'Property' && getPropertyName(property, sourceCode.getScope(property)) === name) {
      return property.value
    }
  }

  return null
}

/**
 * A string literal, a registered-sanitizer call, or a template literal whose
 * expressions are each one of those — recursively, so a static wrapper
 * around a sanitized interpolation
 * (`` `window.dataLayer.push(${safeJsonStringify(data)})` ``) is exactly as
 * safe as the sanitizer call would be inline. Enough to cover icon sprites,
 * static markup, and the JSON-in-script family without pretending to
 * understand string building in general.
 */
function isSafe(analysis, node) {
  if (!node) return false
  if (node.type === 'Literal') return true
  if (node.type === 'TemplateLiteral') return node.expressions.every(expression => isSafe(analysis, expression))
  return analysis.sanitizedAt(node, 'html')
}
