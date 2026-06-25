const { getJSXElementName, getParentJSXElements, isComponentName } = require('../../machinery/ast')
const docsUrl = require('../../machinery/docsUrl')

const defaultDeny = [
  { parent: 'Container*', child: 'Container*' },
  { parent: 'Heading*', child: 'Heading*' },
]

const messages = {
  'nested component': (child, parent) =>
    `Unexpected '${child}' nested inside '${parent}' — these components must not be nested`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent specific React components from being nested inside each other',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          deny: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                child: { type: 'string' },
              },
              required: ['parent', 'child'],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {}
    const deny = options.deny || defaultDeny

    return {
      JSXOpeningElement(node) {
        const jsxElement = node.parent
        const name = getJSXElementName(jsxElement)

        if (!isComponentName(name)) return

        const matchingRules = deny.filter(x => matches(name, x.child))
        if (!matchingRules.length) return

        const ancestors = getParentJSXElements(jsxElement)
        for (const ancestor of ancestors) {
          const ancestorName = getJSXElementName(ancestor)
          if (!isComponentName(ancestorName)) continue

          for (const rule of matchingRules) {
            if (matches(ancestorName, rule.parent)) {
              context.report({
                message: messages['nested component'](name, ancestorName),
                node,
              })
              return
            }
          }
        }
      },
    }
  },
}

function matches(name, pattern) {
  if (pattern.endsWith('*')) return name.startsWith(pattern.slice(0, -1))
  return name === pattern
}
