const docsUrl = require('../../machinery/docsUrl')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require functions on an instance to bind `this`, so they keep working when detached',
      url: docsUrl(__dirname),
    },
    messages: {
      useArrowFunction: 'Use an arrow function so `this` is bound: `name = () => {}`',
      bindGenerator: 'A generator cannot be an arrow function, bind `this` in the constructor: `this.name = name.bind(this)`',
      bindReference: 'Assigning a function does not bind `this`, bind it explicitly: `this.name = name.bind(this)`',
    },
    schema: [],
  },

  create(context) {
    return {
      MethodDefinition(node) {
        if (node.static) return
        if (!isPlainMethod(node)) return

        reportUnboundThis(node, node.value)
      },

      PropertyDefinition(node) {
        if (node.static) return

        reportUnboundThis(node, node.value)
      },

      AssignmentExpression(node) {
        if (!isAssignmentToThis(node)) return

        reportUnboundThis(node, node.right)
      },
    }

    function reportUnboundThis(node, value) {
      if (isFunctionExpression(value))
        return context.report({ node, messageId: value.generator ? 'bindGenerator' : 'useArrowFunction' })

      if (referencesFunction(value, context))
        return context.report({ node, messageId: 'bindReference' })
    }
  },
}

function isPlainMethod(node) {
  return node.kind === 'method'
}

function isAssignmentToThis(node) {
  return node.left.type === 'MemberExpression' && node.left.object.type === 'ThisExpression'
}

function isFunctionExpression(node) {
  return !!node && node.type === 'FunctionExpression'
}

function referencesFunction(value, context) {
  if (!value || value.type !== 'Identifier') return false

  const declaration = findDeclaration(value, context)
  return !!declaration && declaration.defs.some(definition => definesFunction(definition.node))
}

function findDeclaration(identifier, context) {
  const scope = context.sourceCode.getScope(identifier)
  const reference = scope.references.find(candidate => candidate.identifier === identifier)

  return reference?.resolved ?? null
}

function definesFunction(node) {
  if (node.type === 'FunctionDeclaration') return true

  return node.type === 'VariableDeclarator' && isFunctionExpression(node.init)
}
