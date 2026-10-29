const docsUrl = require('../../machinery/docsUrl')

const MEDIA_FEATURES = new Set([
  'any-hover',
  'any-pointer',
  'aspect-ratio',
  'color',
  'color-gamut',
  'color-index',
  'device-aspect-ratio',
  'device-height',
  'device-width',
  'display-mode',
  'dynamic-range',
  'forced-colors',
  'grid',
  'height',
  'hover',
  'inverted-colors',
  'light-level',
  'monochrome',
  'orientation',
  'overflow-block',
  'overflow-inline',
  'pointer',
  'prefers-color-scheme',
  'prefers-contrast',
  'prefers-reduced-data',
  'prefers-reduced-motion',
  'prefers-reduced-transparency',
  'resolution',
  'scan',
  'scripting',
  'update',
  'width',
])

const SINGLE_FEATURE = /^\s*([a-z-]+)(\s*:[^()]*)?\s*$/i

const messages = {
  'feature not in parentheses':
    (feature) => `Media feature '${feature}' must be wrapped in parentheses - without them the query ` +
      `parses as an unknown media type and never matches`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Media features in matchMedia must be wrapped in parentheses',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    return {
      "CallExpression[callee.name = 'matchMedia'], CallExpression[callee.object.name = 'window'][callee.property.name = 'matchMedia']"(node) {
        const [argument] = node.arguments
        const query = argument && getQueryText(argument)
        if (query === undefined) return

        const [feature] = findBareFeatures(query)
        if (!feature) return

        context.report({
          message: messages['feature not in parentheses'](feature),
          node: argument,
          fix: isSingleFeature(query)
            ? (fixer) => fixer.replaceText(argument, wrapInParentheses(argument, query))
            : null,
        })
      },
    }
  },
}

function getQueryText(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked
}

function findBareFeatures(query) {
  let depth = 0
  let outsideParentheses = ''

  for (const character of query) {
    if (character === '(') depth += 1
    else if (character === ')') depth -= 1
    else if (depth === 0) outsideParentheses += character
  }

  return (outsideParentheses.match(/[a-z-]+/gi) ?? []).filter(isMediaFeature)
}

function isMediaFeature(word) {
  return MEDIA_FEATURES.has(word.replace(/^(min|max)-/, ''))
}

function isSingleFeature(query) {
  const match = SINGLE_FEATURE.exec(query)
  return match !== null && isMediaFeature(match[1])
}

function wrapInParentheses(node, query) {
  const quote = node.type === 'Literal' ? node.raw[0] : '`'
  return `${quote}(${query.trim()})${quote}`
}
