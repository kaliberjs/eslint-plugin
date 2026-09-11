const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Provider API keys have distinctive shapes — high entropy with known
// prefixes. Unlike generic secret scanning, matching these patterns is
// precise: a string that looks exactly like an AWS key id or an OpenAI key
// is one. Private-key PEM blocks are equally unambiguous.

const KEY_PATTERNS = [
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'GitHub token', re: /\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}\b/ },
  { name: 'Google API key', re: /\bAIza[A-Za-z0-9_-]{30,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'private key block', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
]

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not embed provider API keys or private keys in source (CWE-798)',
      url: docsUrl(__dirname),
    },
    messages: {
      apiKeyPattern: [
        'This string matches the shape of {{ kind }}.',
        'Keys in source leak through git history, bundles and build logs.',
        'Move it to configuration outside the source and rotate the exposed key.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string') checkString(context, node, node.value)
      },

      // A no-substitution template folds to its cooked string. PEM blocks
      // in particular are routinely written this way — backticks are the
      // natural way to get literal newlines without escaping them.
      TemplateLiteral(node) {
        if (node.expressions.length) return
        checkString(context, node, node.quasis[0].value.cooked)
      },
    }
  },
}

function checkString(context, node, value) {
  for (const { name, re } of KEY_PATTERNS) {
    if (!re.test(value)) continue

    report(context, {
      node,
      messageId: 'apiKeyPattern',
      data: { kind: name },
      severity: 'medium',
      confidence: 1,
    })
    return
  }
}
