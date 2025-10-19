const eslintPluginImport = require('eslint-plugin-import')
const { isApp, isTemplate, getFilename } = require('../../machinery/filename');
const { defineRule } = require('oxlint');

module.exports = defineRule({
  meta: { type: 'problem' },

  createOnce(context) {
    return {
      ExportDefaultDeclaration: (node) => {
        const filename = getFilename(context);
        if (isApp(filename) || isTemplate(filename)) return {}
        
        return eslintPluginImport.rules['no-default-export'].create(context).ExportDefaultDeclaration(node)
      }
    }
  }
})
