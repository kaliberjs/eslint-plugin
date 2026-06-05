const path = require('node:path')
const docsUrl = require('../../machinery/docsUrl')
const messages = {
  'no relative parent import': found =>
    `Unexpected relative parent import '${found}' - use a root slash import`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Disallow ../ imports — use root-slash imports that survive file moves',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
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
        node: source,
        fix(fixer) {
          const filePath = context.filename
          const resolved = path.resolve(path.dirname(filePath), value)
          const srcRoot = findSrcRoot(filePath)
          if (!srcRoot) return null

          const rootSlash = '/' + resolved.slice(srcRoot.length + 1)
          const quote = source.raw[0]
          return fixer.replaceText(source, `${quote}${rootSlash}${quote}`)
        }
      })
    }
  }
}

function findSrcRoot(filePath) {
  const segments = filePath.split(path.sep)
  const srcIndex = segments.lastIndexOf('src')
  if (srcIndex === -1) return null
  return segments.slice(0, srcIndex + 1).join(path.sep)
}
