const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// A dynamically-resolved module specifier means the module graph no longer
// says what the program loads — an attacker-controlled value becomes an
// arbitrary-module (and often arbitrary-file) load. The static map of
// allowed modules is the fix, not a sanitizer.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not resolve modules from dynamic specifiers (CWE-427)',
      url: docsUrl(__dirname),
    },
    messages: {
      dynamicRequire: [
        '{{ form }} resolves its module from a value that is not a literal.',
        'The module graph no longer bounds what can be loaded; a tainted specifier becomes an arbitrary-file read or code load.',
        'Use a static import, or a literal-keyed lookup table over statically imported modules.',
      ].join(' '),
    },
    // No autofix: the static map needs application knowledge.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const name = callee.type === 'Identifier' ? callee.name : null

        // require(x) with a non-literal argument.
        if (name === 'require' && !isLiteral(node.arguments[0])) {
          return emit(context, node, 'require()')
        }

        // createRequire(...)(x) — the ESM-compatible escape hatch has the
        // same problem one call deeper.
        if (
          callee.type === 'CallExpression'
          && getCalleeName(callee.callee) === 'createRequire'
          && !isLiteral(node.arguments[0])
        ) {
          return emit(context, node, 'createRequire()')
        }
      },

      'ImportExpression'(node) {
        if (!isLiteral(node.source)) emit(context, node, 'import()')
      },
    }
  },
}

function getCalleeName(callee) {
  if (callee?.type === 'Identifier') return callee.name
  if (callee?.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}

/**
 * A string literal or a no-substitution template — the specifier is fully
 * static either way, so webpack-style `require(`./x.json`)` stays quiet.
 */
function isLiteral(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return true
  return node?.type === 'TemplateLiteral' && node.expressions.length === 0
}

function emit(context, node, form) {
  report(context, {
    node,
    messageId: 'dynamicRequire',
    data: { form },
    severity: 'medium',
    confidence: 1,
  })
}
