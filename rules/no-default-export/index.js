const { defineCompatibleRule } = require('../../machinery/define-compatible-rule')
const { isApp, isTemplate, isUniversal, isRaw, getFilename } = require('../../machinery/filename')

function createLogic(context) {
  return {
    ExportDefaultDeclaration: (node) => {
      const filename = getFilename(context)
      if (isApp(filename) || isTemplate(filename) || isUniversal(filename) || isRaw(filename)) return

      context.report({
        node,
        messageId: 'noDefaultExport',
      })
    },
    ExportNamedDeclaration: (node) => {
      const filename = getFilename(context)
      if (isApp(filename) || isTemplate(filename) || isUniversal(filename) || isRaw(filename)) return

      for (const specifier of node.specifiers) {
        if (specifier.exported.name === 'default') {
          context.report({
            node: specifier,
            messageId: 'noDefaultExport',
          })
        }
      }
    }
  }
}

module.exports = defineCompatibleRule({
  meta: {
    type: 'problem',
    messages: {
      noDefaultExport: 'Prefer named exports.',
    },
    schema: [], // Always good to include for ESLint
  },
  create: createLogic,
})
