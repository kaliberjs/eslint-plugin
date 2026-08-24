const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Reverse-tabnabbing: a page opened via target="_blank" could, historically,
// control the opener via window.opener. Modern browsers imply noopener for
// anchor targets — which is why this rule is low severity for anchors and
// reserves its real finding for window.open, where the opener relationship
// still exists unless explicitly severed.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not open untrusted windows without severing the opener relationship (CWE-1022)',
      url: docsUrl(__dirname),
    },
    messages: {
      anchorNoopener: [
        "A link with target=\"_blank\" has no rel=\"noopener\".",
        'Modern browsers imply it for anchors, but spelling it out keeps the guarantee against legacy embeds and non-browser contexts.',
        'Add rel="noopener noreferrer".',
      ].join(' '),
      windowOpenNoopener: [
        'window.open() without noopener in its features gives the opened page a window.opener handle.',
        'The opened page can then navigate or script this application.',
        "Pass 'noopener' in the features argument (third argument).",
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      JSXElement(node) {
        const name = node.openingElement?.name?.name
        if (name !== 'a') return

        const attributes = node.openingElement.attributes ?? []
        const target = attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'target')
        if (!isBlankLiteral(target)) return

        const rel = attributes.find(a => a.type === 'JSXAttribute' && a.name?.name === 'rel')
        if (hasNoopener(rel)) return

        report(context, {
          node: node.openingElement,
          messageId: 'anchorNoopener',
          severity: 'low',
          confidence: 1,
        })
      },

      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return
        if (callee.property?.name !== 'open') return
        // window.open only — other .open calls are files, databases, sockets.
        const root = String(callee.object?.name ?? '')
        if (!/^window$/i.test(root)) return

        const features = node.arguments[2]
        // No features argument at all is the default-opener case.
        if (!features) {
          return report(context, { node, messageId: 'windowOpenNoopener', severity: 'medium', confidence: 0.9 })
        }
        if (features.type === 'Literal' && !/noopener/i.test(String(features.value))) {
          return report(context, { node, messageId: 'windowOpenNoopener', severity: 'medium', confidence: 1 })
        }
      },
    }
  },
}

function isBlankLiteral(attribute) {
  return attribute?.type === 'JSXAttribute'
    && attribute.value?.type === 'Literal'
    && attribute.value.value === '_blank'
}

function hasNoopener(rel) {
  const value = rel?.value
  if (!value) return false
  const text = value.type === 'JSXExpressionContainer'
    ? (value.expression?.type === 'Literal' ? String(value.expression.value) : null)
    : String(value.value ?? '')
  return text ? /noopener/i.test(text) : true // dynamic rel: give benefit of the doubt? no—unknown means unchecked; treat as present to stay quiet on computed values
}
