const docsUrl = require('../../machinery/docsUrl')
const { isStaticExpression, getImportAccessPath } = require('../../machinery/security')

const CHILD_PROCESS_PACKAGES = ['child_process', 'node:child_process']
const DANGEROUS_METHODS = ['exec', 'execSync']

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects child_process exec() calls with non-literal arguments, which can lead to command injection',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      childProcessExec: 'child_process.{{method}}() called with a non-literal argument — this can lead to command injection',
      bareRequire: 'Found require("{{package}}") — child_process should be used carefully',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode()

    return {
      CallExpression(node) {
        // Check for bare require('child_process') without assignment/access
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
          const arg = node.arguments[0]
          if (
            arg &&
            arg.type === 'Literal' &&
            CHILD_PROCESS_PACKAGES.includes(arg.value) &&
            node.parent.type !== 'VariableDeclarator' &&
            node.parent.type !== 'AssignmentExpression' &&
            node.parent.type !== 'MemberExpression'
          ) {
            context.report({
              node,
              messageId: 'bareRequire',
              data: { package: arg.value },
            })
          }
          return
        }

        // Skip calls with no arguments or all-static arguments
        if (
          node.arguments.length === 0 ||
          isStaticExpression(node.arguments[0], sourceCode.getScope ? sourceCode.getScope(node) : context.getScope())
        ) return

        const scope = sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()

        // Use getImportAccessPath to resolve the callee back to child_process
        const pathInfo = getImportAccessPath({
          node: node.callee,
          scope,
          packageNames: CHILD_PROCESS_PACKAGES,
        })

        // Only flag exec/execSync
        const method = pathInfo && pathInfo.path.length === 1 && pathInfo.path[0]
        if (!method || !DANGEROUS_METHODS.includes(method)) return

        context.report({
          node,
          messageId: 'childProcessExec',
          data: { method },
        })
      },
    }
  },
}
