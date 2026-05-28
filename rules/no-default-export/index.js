const eslintPluginImport = require('eslint-plugin-import-x')
const { isApp, isTemplate } = require('../../machinery/filename')
const upstreamRule = eslintPluginImport.rules['no-default-export']

module.exports = {
  meta: upstreamRule.meta,

  create(context) {
    if (isApp(context) || isTemplate(context)) return {}
    return eslintPluginImport.rules['no-default-export'].create(context)
  }
}
