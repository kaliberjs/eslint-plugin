const docsUrl = require('../../machinery/docsUrl')
const { isFunctionNode } = require('../../machinery/ast')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, accessOf } = require('../../machinery/firebase-rules')

// `.read` and `.write` cascade: once an ancestor grants access, nothing below
// it can take that access away. A narrower rule further down reads like a
// restriction and has no effect.

const reach = { anyone: 2, 'signed-in': 1 }

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.read` or `.write` that narrows what an ancestor already grants, which has no effect (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      shadowed: '`{{key}}` at {{path}} has no effect: `{{key}}` at {{ancestor}} already grants {{who}} access to everything below it.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { env = {} } = context.options[0] ?? {}
    const { sourceCode } = context

    return {
      Property(node) {
        const key = keyOf(node, sourceCode)

        if (key !== '.read' && key !== '.write') return

        const rule = staticValue(node.value, sourceCode, env)

        if (rule.unresolved) return

        const grant = widestAncestorGrant(node, key, sourceCode, env)

        if (!grant || reachOf(rule.value) >= reach[grant.access]) return

        context.report({
          node,
          messageId: 'shadowed',
          data: {
            key,
            path: pathOf(node, sourceCode).join('/'),
            ancestor: pathOf(grant.node, sourceCode).join('/') || 'the root',
            who: grant.access === 'anyone' ? 'anyone' : 'any signed-in client',
          },
        })
      },
    }
  },
}

function widestAncestorGrant(node, key, sourceCode, env) {
  let widest = null

  for (let x = node.parent.parent; x && !isFunctionNode(x); x = x.parent) {
    if (x.type !== 'ObjectExpression') continue

    const rule = x.properties.find(property => property.type === 'Property' && keyOf(property, sourceCode) === key)
    const access = rule && accessOf(staticValue(rule.value, sourceCode, env).value, { unconditional: true })

    if (access && reach[access] > (reach[widest?.access] ?? 0)) widest = { node: rule, access }
  }

  return widest
}

function reachOf(value) {
  return reach[accessOf(value, { unconditional: true })] ?? 0
}
