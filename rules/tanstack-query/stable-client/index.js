const docsUrl = require('../../../machinery/docsUrl')
const { isFunctionNode, isInsideComponent, isArrowConciseBody, isUseStateCall } = require('../../../machinery/ast')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent creating a new QueryClient inside a React component body — it must be stable across renders',
      url: docsUrl(__dirname),
    },
    messages: {
      unstable: [
        'QueryClient is not stable.',
        'Move it outside the component or wrap it in useState(() => new QueryClient()).',
        'See https://tanstack.com/query/v5/docs/eslint/stable-query-client',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      NewExpression(node) {
        if (!isQueryClientConstructor(node)) return
        if (!isInsideComponent(node)) return
        if (isWrappedInUseState(node)) return

        context.report({ node, messageId: 'unstable' })
      },
    }
  },
}

/** @returns {boolean} */
function isQueryClientConstructor(node) {
  return node.callee.type === 'Identifier' && node.callee.name === 'QueryClient'
}

/**
 * Check whether the `new QueryClient()` is the initializer of a useState call:
 *   useState(() => new QueryClient())
 *   React.useState(() => new QueryClient())
 *   const [qc] = useState(() => new QueryClient())
 */
function isWrappedInUseState(node) {
  const parent = node.parent
  if (!parent) return false

  // Concise arrow body: useState(() => new QueryClient())
  if (isArrowConciseBody(parent, node) && isUseStateCall(parent.parent)) return true

  // Block body: useState(() => { return new QueryClient() })
  if (parent.type === 'ReturnStatement') {
    const blockParent = parent.parent
    if (blockParent && blockParent.parent && isFunctionNode(blockParent.parent)) {
      if (isUseStateCall(blockParent.parent.parent)) return true
    }
  }

  return false
}
