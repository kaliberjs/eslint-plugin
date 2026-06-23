const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'universal in universal': (componentName) =>
    `Unexpected universal component '${componentName}' rendered inside a universal file — universal components create separate hydration boundaries and must not be nested`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow rendering universal components inside other universal files',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    if (!context.filename.endsWith('.universal.js')) return {}

    const universalImports = new Map()

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (!source.endsWith('.universal')) return

        for (const specifier of node.specifiers) {
          universalImports.set(specifier.local.name, source)
        }
      },

      JSXOpeningElement(node) {
        const { name } = node
        const elementName = name.type === 'JSXIdentifier' ? name.name
          : name.type === 'JSXMemberExpression' ? name.property.name
          : null

        if (!elementName || !universalImports.has(elementName)) return

        context.report({
          message: messages['universal in universal'](elementName),
          node,
        })
      },
    }
  },
}
