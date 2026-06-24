const docsUrl = require('../../machinery/docsUrl')

const sectionWords = new Set([
  'calculate',
  'calculation',
  'check',
  'checks',
  'cleanup',
  'data',
  'effects',
  'events',
  'fallback',
  'fetch',
  'guard',
  'guards',
  'handlers',
  'helpers',
  'init',
  'initialize',
  'normalize',
  'parse',
  'persist',
  'render',
  'save',
  'setup',
  'state',
  'styles',
  'transform',
  'validate',
  'validation',
])

const ignoredPrefixes = [
  'eslint',
  'global',
  'exported',
  'istanbul',
  'c8',
  'prettier',
  'todo',
  'fixme',
  'hack',
  'note',
  'warning',
  'why',
  'no default',
]

const messages = {
  sectionComment:
    'Replace this section comment with a named function that describes the step.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow section comments inside functions when extraction would be clearer',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    const functionRanges = []

    return {
      FunctionDeclaration: rememberFunctionRange,
      FunctionExpression: rememberFunctionRange,
      ArrowFunctionExpression: rememberFunctionRange,
      'Program:exit'() {
        const sourceCode = context.sourceCode

        for (const comment of sourceCode.getAllComments()) {
          if (!isInsideFunction(comment, functionRanges)) continue
          if (!isSectionComment(comment.value)) continue

          context.report({
            node: comment,
            messageId: 'sectionComment',
          })
        }
      },
    }

    function rememberFunctionRange(node) {
      functionRanges.push(node.range)
    }
  },
}

function isInsideFunction(comment, functionRanges) {
  return functionRanges.some(([start, end]) =>
    comment.range[0] > start && comment.range[1] < end
  )
}

function isSectionComment(value) {
  const text = normalizeComment(value)
  if (!text) return false
  if (ignoredPrefixes.some(prefix => text.toLowerCase().startsWith(prefix))) return false

  const words = text.split(/\s+/)
  if (words.length > 4) return false
  if (words.some(word => /[.?!()[\]{}]/.test(word))) return false
  if (words.some(word => word.length > 24)) return false

  return (
    words.some(word => sectionWords.has(word.toLowerCase())) ||
    words.every(startsWithUppercase)
  )
}

function normalizeComment(value) {
  return value
    .split('\n')
    .map(line => line.replace(/^\s*\*?\s?/, '').trim())
    .join(' ')
    .replace(/:$/, '')
    .trim()
}

function startsWithUppercase(word) {
  const [firstLetter] = word
  return Boolean(firstLetter && firstLetter === firstLetter.toUpperCase())
}
