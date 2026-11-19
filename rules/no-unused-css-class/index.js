const path = require('node:path')

const { classesOf } = require('../../machinery/cssModule')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'unused classes': (stylesheet, names) =>
    `Unexpected unused ${names.length === 1 ? 'class' : 'classes'} in '${stylesheet}': ` +
    `${names.map(name => `'.${name}'`).join(', ')} - nothing in this file reads ${names.length === 1 ? 'it' : 'them'}. ` +
    `Remove the class, or use it`,
}

module.exports = {
  messages,

  meta: {
    type: 'suggestion',
    docs: {
      description: 'A class a CSS Module defines should be read by the component that imports it',
      url: docsUrl(__dirname),
    },
    schema: [{
      type: 'object',
      properties: { ignore: { type: 'array', items: { type: 'string' } } },
      additionalProperties: false,
    }],
  },

  create(context) {
    const [{ ignore = [] } = {}] = context.options

    return {
      ImportDeclaration(node) {
        const stylesheet = node.source.value
        if (!stylesheet.endsWith('.css') || !stylesheet.startsWith('.')) return

        const [binding] = context.sourceCode.getDeclaredVariables(node)
          .filter(variable => variable.defs.some(def => def.node.type === 'ImportDefaultSpecifier'))
        if (!binding) return

        const file = path.resolve(path.dirname(context.filename), stylesheet)
        if (ignore.some(pattern => path.matchesGlob(file, pattern))) return

        const { classes, error } = classesOf(file)
        // Reported by `no-undef-css-class`, which reads the same stylesheet. Saying it twice for
        // one unreadable file tells nobody anything the first message did not.
        if (error) return

        const read = classesRead(binding)
        if (!read) return

        const unused = [...classes].filter(name => !read.has(name))
        if (unused.length) {
          context.report({ node: node.source, message: messages['unused classes'](stylesheet, unused) })
        }
      },
    }
  },
}

/**
 * Which classes this file reads, or `null` where that cannot be established.
 *
 * One `styles[name]` or one `{...styles}` and the question is over: any class could be the one
 * that reads, and a rule that reports the rest as unused is telling somebody to delete a class
 * their code uses. Abstaining is the only answer that is not a guess.
 */
function classesRead(binding) {
  const read = new Set()
  for (const { identifier } of binding.references) {
    const { parent } = identifier
    const reads = parent.type === 'MemberExpression' && parent.object === identifier && !parent.computed
    if (!reads) return null
    read.add(parent.property.name)
  }
  return read
}
