const { defineCompatibleRule } = require('../../machinery/define-compatible-rule')
const { isApp, isTemplate, getFilename } = require('../../machinery/filename')

function createLogic(context) {
  return {
    ExportDefaultDeclaration: (node) => {
      const filename = getFilename(context)
      if (isApp(filename) || isTemplate(filename)) return

      context.report({
        node,
        messageId: 'noDefaultExport',
      })
    }
  }
}

module.exports = defineCompatibleRule({
  meta: {
    type: 'problem',
    messages: {
      noDefaultExport: 'Default exports are not allowed in this file type. Use named exports instead.',
    },
    schema: [], // Always good to include for ESLint
  },
  create: createLogic,
})
