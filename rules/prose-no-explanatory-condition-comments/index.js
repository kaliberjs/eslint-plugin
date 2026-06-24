const docsUrl = require('../../machinery/docsUrl')

const explanatoryPrefixes = [
  'check if', 'check that', 'check whether',
  'verify if', 'verify that', 'verify whether',
  'validate if', 'validate that', 'validate whether',
  'ensure if', 'ensure that', 'ensure whether',
  'see if', 'test if', 'test that',
  'render if', 'render when', 'show if', 'show when',
  'hide if', 'hide when',
  'only if', 'only when',
]

const ignoredPrefixes = [
  'eslint',
  'todo',
  'fixme',
  'hack',
  'note',
  'why',
  'warning',
  '@ts-',
  'istanbul',
  'c8',
  'prettier',
]

const messages = {
  explanatoryConditionComment:
    'Remove this explanatory comment. If the condition needs explaining, extract it into a named predicate.',
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments before conditionals that just restate the condition',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages,
  },

  create(context) {
    const sourceCode = context.sourceCode

    return {
      IfStatement: checkNode,
      WhileStatement: checkNode,
      DoWhileStatement: checkNode,
    }

    function checkNode(node) {
      const comment = getCommentImmediatelyBefore(sourceCode, node)
      if (!comment) return

      const text = normalizeComment(comment.value)
      if (!text) return
      if (isIgnoredComment(text)) return
      if (!isExplanatoryComment(text)) return

      context.report({
        node: comment,
        messageId: 'explanatoryConditionComment',
      })
    }
  },
}

function getCommentImmediatelyBefore(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node)
  if (!comments.length) return null

  const last = comments[comments.length - 1]
  const commentEnd = last.loc.end.line
  const nodeStart = node.loc.start.line
  if (nodeStart - commentEnd > 1) return null

  return last
}

function normalizeComment(value) {
  return value
    .split('\n')
    .map(line => line.replace(/^\s*\*?\s?/, '').trim())
    .join(' ')
    .trim()
}

function isIgnoredComment(text) {
  const lower = text.toLowerCase()
  return ignoredPrefixes.some(prefix => lower.startsWith(prefix))
}

function isExplanatoryComment(text) {
  const lower = text.toLowerCase()
  return explanatoryPrefixes.some(prefix => lower.startsWith(prefix))
}
