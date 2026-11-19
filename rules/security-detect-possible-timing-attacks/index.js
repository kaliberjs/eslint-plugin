const docsUrl = require('../../machinery/docsUrl')

const DEFAULT_KEYWORDS = ['password', 'secret', 'api', 'apiKey', 'token', 'auth', 'pass', 'hash']

function buildKeywordRe(keywords) {
  return new RegExp(`^(${keywords.join('|')})$`, 'i')
}

function containsKeyword(node, re) {
  return node.type === 'Identifier' && re.test(node.name)
}

function isLiteral(node) {
  return node.type === 'Literal' || node.type === 'TemplateLiteral'
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects insecure comparisons of security-sensitive values that may be vulnerable to timing attacks',
      url: docsUrl(__dirname),
    },
    schema: [{
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of variable names to treat as security-sensitive (default: password, secret, api, apiKey, token, auth, pass, hash)',
        },
      },
      additionalProperties: false,
    }],
    messages: {
      timingAttack: 'Comparing \'{{name}}\' with {{operator}} is vulnerable to timing attacks — use crypto.timingSafeEqual() instead',
    },
  },
  create(context) {
    const options = context.options[0] || {}
    const keywords = options.keywords || DEFAULT_KEYWORDS
    const keywordRe = buildKeywordRe(keywords)

    return {
      BinaryExpression(node) {
        if (!['==', '===', '!=', '!=='].includes(node.operator)) return

        const left = containsKeyword(node.left, keywordRe)
        const right = containsKeyword(node.right, keywordRe)
        if (!left && !right) return

        // Skip comparisons against literals — real timing attacks compare two
        // dynamic values (e.g. userInput === storedSecret), never a variable
        // against a hardcoded string like 'form' or '--help'
        const other = left ? node.right : node.left
        if (isLiteral(other)) return

        const name = left ? node.left.name : node.right.name
        context.report({
          node,
          messageId: 'timingAttack',
          data: { name, operator: node.operator },
        })
      },
    }
  },
}
