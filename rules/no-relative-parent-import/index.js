const { defineRule } = require("oxlint")

const messages = {
  'no relative parent import': found =>
    `Unexpected relative parent import '${found}' - use a root slash import`,
}

module.exports = defineRule({
  messages,

  meta: { type: 'problem' },

  createOnce(context) {
    return {
      'ImportDeclaration': reportRelativeImportInSource,
      'ExportNamedDeclaration': reportRelativeImportInSource,
      'ExportAllDeclaration': reportRelativeImportInSource,
    }

    function reportRelativeImportInSource({ source }) {
      if (!source) return
      const { value } = source
      if (!value.includes('..')) return

      context.report({
        message: messages['no relative parent import'](value),
        node: source
      })
    }
  }
})
