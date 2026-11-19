const docsUrl = require('../../machinery/docsUrl')

// Simplified ReDoS detection: catches nested quantifiers like (a+)+, (a*)*
// which are the most common cause of catastrophic backtracking
const NESTED_QUANTIFIER_RE = /\([^)]*[+*][^)]*\)[+*?]|\([^)]*[+*][^)]*\)\{/

function isUnsafeRegexPattern(pattern) {
  if (typeof pattern !== 'string') return false
  return NESTED_QUANTIFIER_RE.test(pattern)
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects potentially unsafe regular expressions that may cause catastrophic backtracking (ReDoS)',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      unsafeRegex: 'Potentially unsafe regular expression — nested quantifiers can cause catastrophic backtracking (ReDoS)',
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (node.regex) {
          if (isUnsafeRegexPattern(node.regex.pattern)) {
            context.report({ node, messageId: 'unsafeRegex' })
          }
        }
      },
      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'RegExp' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          if (isUnsafeRegexPattern(node.arguments[0].value)) {
            context.report({ node, messageId: 'unsafeRegex' })
          }
        }
      },
    }
  },
}
