const eslintPluginImport = require('eslint-plugin-import-x')
const { isApp, isTemplate } = require('../../machinery/filename')
const upstreamRule = eslintPluginImport.rules['no-default-export']

module.exports = {
  meta: {
    ...upstreamRule.meta,
    docs: {
      ...upstreamRule.meta.docs,
      description: 'Prefer named exports over default exports — except in App, template, and page files',
      url: `file://${__dirname}/readme.md`,
    },
  },

  create(context) {
    if (isApp(context) || isTemplate(context)) return {}
    return eslintPluginImport.rules['no-default-export'].create(context)
  }
}
