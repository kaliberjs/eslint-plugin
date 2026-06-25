const { relative } = require('node:path')
const docsUrl = require('../../machinery/docsUrl')
const { getImportGraph } = require('../../machinery/importGraph')

const messages = {
  'universal in universal': (componentName) =>
    `Unexpected universal component '${componentName}' rendered inside a universal file — universal components create separate hydration boundaries and must not be nested`,
  'transitive universal nesting': (chain) =>
    `Transitive universal nesting — this file reaches another .universal.js through: ${chain}`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow rendering universal components inside other universal files',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    if (!context.filename.endsWith('.universal.js')) return {}

    const universalImports = new Map()
    const directUniversalSources = new Set()

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (!source.endsWith('.universal')) return

        directUniversalSources.add(source)
        for (const specifier of node.specifiers) {
          universalImports.set(specifier.local.name, source)
        }
      },

      JSXOpeningElement(node) {
        const { name } = node
        const elementName = name.type === 'JSXIdentifier' ? name.name
          : name.type === 'JSXMemberExpression' ? name.object.name
          : null

        if (!elementName || !universalImports.has(elementName)) return

        context.report({
          message: messages['universal in universal'](elementName),
          node,
        })
      },

      'Program:exit'() {
        const cwd = context.getCwd ? context.getCwd() : process.cwd()
        const graph = getImportGraph(cwd)
        if (!graph) return

        const relPath = relative(cwd, context.filename)
        const allDeps = graph.transitiveDeps(relPath)

        for (const dep of allDeps) {
          if (!dep.endsWith('.universal.js')) continue

          // Skip if already caught by the direct check
          const depWithoutExtension = dep.replace(/\.js$/, '')
          const isDirectImport = [...directUniversalSources].some(
            source => depWithoutExtension.endsWith(source.replace(/^\//, ''))
          )
          if (isDirectImport) continue

          const chain = graph.findChain(relPath, dep)
          if (!chain) continue

          context.report({
            message: messages['transitive universal nesting'](chain.join(' → ')),
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
          })
        }
      },
    }
  },
}
