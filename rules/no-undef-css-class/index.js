const path = require('node:path')

const { classesOf } = require('../../machinery/cssModule')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'no such class': (binding, name, stylesheet) =>
    `Unexpected '${binding}.${name}', '${stylesheet}' has no '.${name}' - the value is undefined, ` +
    `so nothing is applied. Correct the name or add the class`,

  'stylesheet not read': (stylesheet, reason) =>
    `Unexpected import of '${stylesheet}', it could not be read (${reason}) - no class from it can be checked`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    docs: {
      description: 'A class read from a CSS Module must be one the imported stylesheet defines',
      url: docsUrl(__dirname),
    },
    schema: [],
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const stylesheet = node.source.value
        if (!stylesheet.endsWith('.css') || !stylesheet.startsWith('.')) return

        const [binding] = context.sourceCode.getDeclaredVariables(node)
          .filter(variable => variable.defs.some(def => def.node.type === 'ImportDefaultSpecifier'))
        if (!binding) return

        const file = path.resolve(path.dirname(context.filename), stylesheet)
        const { classes, error } = classesOf(file)
        if (error) {
          context.report({ node: node.source, message: messages['stylesheet not read'](stylesheet, error) })
          return
        }

        for (const { identifier } of binding.references) {
          const name = classNameAt(identifier)
          if (name === null || classes.has(name)) continue
          context.report({
            node: identifier.parent.property,
            message: messages['no such class'](binding.name, name, stylesheet),
          })
        }
      },
    }
  },
}

/**
 * Which class a reference reads, where that is decidable. `styles[name]` is not: which class it
 * reads is what the rule would have to guess, and a guess here is a wrong verdict on working code.
 */
function classNameAt(identifier) {
  const { parent } = identifier
  const reads = parent.type === 'MemberExpression' && parent.object === identifier && !parent.computed
  return reads ? parent.property.name : null
}
