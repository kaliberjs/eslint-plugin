const docsUrl = require('../../machinery/docsUrl')
const {
  getLayer, getLayerFromImportPath,
  isSublayerOf, matchesLayerPattern,
} = require('../../machinery/filename')

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
    const layers = buildLayers(options.layers)
    const sublayerParents = getSublayerParents(layers)

    return {
      'ImportDeclaration': checkImport,
      'ExportNamedDeclaration': checkImport,
      'ExportAllDeclaration': checkImport,
    }

    function checkImport({ source }) {
      if (!source) return

      const importPath = source.value
      if (!importPath.startsWith('/')) return

      const sourceLayer = getLayer(context.filename, sublayerParents)
      if (!sourceLayer) return

      const targetLayer = getLayerFromImportPath(importPath, sublayerParents)
      if (!targetLayer) return

      if (sourceLayer === targetLayer) return

      const allowList = findAllowList(layers, sourceLayer, sublayerParents)
      if (!allowList) return

      if (allowList.some(pattern => matchesLayerPattern(targetLayer, pattern, sublayerParents))) return

      context.report({
        message: messages['restricted layer import'](importPath, sourceLayer, targetLayer),
        node: source,
      })
    }
  }
}

/**
 * Extract sublayer parents from layer config.
 * Any key like `foo/*` means `foo` is a sublayer parent.
 */
function getSublayerParents(layers) {
  return Object.keys(layers)
    .filter(key => key.endsWith('/*'))
    .map(key => key.slice(0, -2))
}

function findAllowList(layers, sourceLayer, sublayerParents) {
  if (layers[sourceLayer]) return layers[sourceLayer]

  for (const parent of sublayerParents) {
    if (isSublayerOf(sourceLayer, parent) && layers[parent + '/*']) {
      return layers[parent + '/*']
    }
  }

  return null
}

/**
 * Builds the final layer map by merging:
 * 1. Default layers as the base
 * 2. Custom layers on top (adding new layers, extending existing ones)
 * 3. sharedRootModules appended to every layer automatically
 */
function buildLayers(customLayers) {
  if (!customLayers) return defaultLayers

  const merged = { ...defaultLayers }

  for (const [layer, allowList] of Object.entries(customLayers)) {
    const base = merged[layer] || []
    const combined = [...new Set([...base, ...allowList, ...sharedRootModules])]
    merged[layer] = combined
  }

  return merged
}
