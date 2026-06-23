const docsUrl = require('../../machinery/docsUrl')
const { getLayer, findSrcRoot } = require('../../machinery/filename')

const messages = {
  'restricted layer import': (importPath, sourceLayer, targetLayer) =>
    `Unexpected import '${importPath}' — '${sourceLayer}' may not import from '${targetLayer}'`,
}

const sharedRootModules = [
  'routeMap', 'routeData', 'routeRedirects',
  'i18n', 'cssGlobal', 'images', 'fonts',
  'search', 'constants', 'groq', 'head',
]

const defaultLayers = {
  'features/buildingBlocks': ['features/buildingBlocks', 'machinery', ...sharedRootModules],
  'features/*': ['features/*', 'features/buildingBlocks', 'machinery', ...sharedRootModules],
  'machinery': ['machinery', ...sharedRootModules],
  'pages': ['pages', 'features', 'machinery', 'templates', 'wrappers', ...sharedRootModules],
  'templates': ['features', 'machinery', ...sharedRootModules],
  'wrappers': ['features', 'machinery', ...sharedRootModules],
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          layers: { type: 'object' },
        },
        additionalProperties: false,
      },
    ],
    docs: {
      description: 'Enforce architectural layer boundaries — prevent imports that cross forbidden layer boundaries',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const layers = options.layers || defaultLayers

    return {
      'ImportDeclaration': checkImport,
      'ExportNamedDeclaration': checkImport,
      'ExportAllDeclaration': checkImport,
    }

    function checkImport({ source }) {
      if (!source) return

      const importPath = source.value
      if (!importPath.startsWith('/')) return

      const sourceLayer = getLayer(context.filename)
      if (!sourceLayer) return

      const targetLayer = getLayerFromImportPath(importPath)
      if (!targetLayer) return

      if (sourceLayer === targetLayer) return

      const allowList = findAllowList(layers, sourceLayer)
      if (!allowList) return

      if (isAllowed(allowList, targetLayer)) return

      context.report({
        message: messages['restricted layer import'](importPath, sourceLayer, targetLayer),
        node: source,
      })
    }
  }
}

function getLayerFromImportPath(importPath) {
  const withoutSlash = importPath.slice(1)
  const segments = withoutSlash.split('/')
  if (!segments.length || !segments[0]) return null

  if (segments[0] === 'features' && segments.length > 1) return 'features/' + segments[1]
  return segments[0]
}

function findAllowList(layers, sourceLayer) {
  if (layers[sourceLayer]) return layers[sourceLayer]
  if (sourceLayer.startsWith('features/') && layers['features/*']) return layers['features/*']
  return null
}

function isAllowed(allowList, targetLayer) {
  return allowList.some(allowed => {
    if (allowed === targetLayer) return true
    if (allowed === 'features' && targetLayer.startsWith('features/')) return true
    if (allowed === 'features/*' && targetLayer.startsWith('features/')) return true
    return false
  })
}
