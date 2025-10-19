const eslintPluginImport = require('eslint-plugin-import')
const { isApp, isTemplate, getFilename } = require('../../machinery/filename')

module.exports = {
  meta: { type: 'problem' },

  create(context) {
    return {
      ExportDefaultDeclaration: (node) => {
        const filename = getFilename(context);
        if (isApp(filename) || isTemplate(filename)) return {}
        
        return eslintPluginImport.rules['no-default-export'].create(context).ExportDefaultDeclaration(node)
      }
    }
  }
}
