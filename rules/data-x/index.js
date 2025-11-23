const { defineRule } = require('oxlint')

const messages = {
  'missing data-x': 'Elements <a> and <button> must have a data-x attribute.',
  'missing data-x-context': 'Elements with data-x should have a data-x-context attribute.',
  'invalid data-x format': 'data-x value should be in kebab-case (e.g., job-overview).',
}

module.exports = defineRule({
  messages,
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce data-x attribute and conventions on interactive elements',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return
        const tagName = node.name.name
        if (tagName !== 'a' && tagName !== 'button') return

        const dataXAttr = node.attributes.find(attr => 
          attr.type === 'JSXAttribute' && 
          attr.name.name === 'data-x'
        )

        if (!dataXAttr) {
          context.report({
            node,
            message: messages['missing data-x'],
          })
          return
        }

        // Check for data-x-context
        const hasDataXContext = node.attributes.some(attr => 
          attr.type === 'JSXAttribute' && 
          attr.name.name === 'data-x-context'
        )

        if (!hasDataXContext) {
          context.report({
            node,
            message: messages['missing data-x-context'],
          })
        }

        // Check data-x format (kebab-case)
        if (dataXAttr.value && dataXAttr.value.type === 'Literal' && typeof dataXAttr.value.value === 'string') {
          const value = dataXAttr.value.value
          const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
          // Allow template strings like {{...}} which might be used in some frameworks, but here we assume standard string or simple interpolation
          // The requirements mention {{...}} for dynamic parts.
          // If it's a literal string, it should be kebab-case.
          // If it contains {{, we skip validation or try to validate the static parts.
          // For now, simple kebab-case check for literals.
          if (!kebabCaseRegex.test(value) && !value.includes('{')) {
             context.report({
              node: dataXAttr,
              message: messages['invalid data-x format'],
            })
          }
        }
      }
    }
  }
})
