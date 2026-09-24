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
      bindGenerator: 'A generator cannot be an arrow function, bind it when assigning it: `{{example}}`',
      bindReference: 'Assigning a function does not bind `this`, bind it explicitly: `this.name = name.bind(this)`',
    },
    schema: [],
  },

  create(context) {
    return {
      MethodDefinition(node) {
        if (node.static) return
        if (!isPlainMethod(node)) return
        if (isGeneratorBoundInConstructor(node)) return

        reportUnboundThis(node, node.value)
      },

      PropertyDefinition(node) {
        if (node.static) return
        if (isGeneratorBoundInConstructor(node)) return

        reportUnboundThis(node, node.value)
      },

      AssignmentExpression(node) {
        if (!isAssignmentToThis(node)) return
        if (!refersToInstance(node)) return

        reportUnboundThis(node, node.right)
      },
    }

    function reportUnboundThis(node, value) {
      if (isFunctionExpression(value) && value.generator) {
        const target = node.type === 'AssignmentExpression' ? 'this.name' : 'name'
        const example = `${target} = (${value.async ? 'async ' : ''}function* () {}).bind(this)`
        return context.report({ node, messageId: 'bindGenerator', data: { example } })
      }

      if (isFunctionExpression(value))
        return context.report({ node, messageId: 'useArrowFunction' })

      if (referencesFunction(value, context))
        return context.report({ node, messageId: 'bindReference' })
    }
  },
}

/**
 * A generator has no arrow form, so binding it in the constructor is a real
 * solution rather than a workaround:
 *
 *   class Stream {
 *     constructor() { this.values = this.values.bind(this) }
 *     *values() {}
 *   }
 *
 * A regular method is left alone — it has an arrow form, which is the house style.
 */
function isGeneratorBoundInConstructor(member) {
  if (!isGeneratorFunction(member.value)) return false

  const name = propertyName(member.key, member.computed)
  if (!name) return false

  const constructorBody = findConstructorBody(member)
  if (!constructorBody) return false

  return constructorBody.body.some(statement => bindsToInstance(statement, name))
}

function findConstructorBody(member) {
  const constructor = member.parent.body.find(isConstructor)

  return constructor?.value.body ?? null
}

function isConstructor(member) {
  return member.type === 'MethodDefinition' && member.kind === 'constructor'
}

function bindsToInstance(statement, name) {
  if (statement.type !== 'ExpressionStatement') return false

  const assignment = statement.expression
  if (assignment.type !== 'AssignmentExpression') return false
  if (!isAssignmentToThis(assignment)) return false
  if (memberName(assignment.left) !== name) return false

  return isBoundToThis(assignment.right)
}

function isBoundToThis(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    memberName(node.callee) === 'bind' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ThisExpression'
  )
}

function memberName(node) {
  return propertyName(node.property, node.computed)
}

function propertyName(key, computed) {
  if (key.type === 'PrivateIdentifier') return `#${key.name}`
  if (key.type === 'Literal') return String(key.value)
  if (!computed && key.type === 'Identifier') return key.name

  return null
}

function isGeneratorFunction(node) {
  return isFunctionExpression(node) && node.generator
}

function isPlainMethod(node) {
  return node.kind === 'method'
}

function isAssignmentToThis(node) {
  return node.left.type === 'MemberExpression' && node.left.object.type === 'ThisExpression'
}

/**
 * `this` only means the instance inside a non-static method body or a field
 * initializer. Plain functions, object methods, static methods, static blocks
 * and module scope each rebind it, arrow functions do not.
 */
function refersToInstance(node) {
  const owner = findThisOwner(node)
  if (!owner) return false

  if (owner.type === 'PropertyDefinition') return !owner.static

  return isInstanceMethodBody(owner)
}

function findThisOwner(node) {
  for (let child = node; child.parent; child = child.parent) {
    const parent = child.parent
    if (parent.type === 'PropertyDefinition' && parent.value !== child) continue
    if (rebindsThis(parent)) return parent
  }

  return null
}

function rebindsThis(node) {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'StaticBlock' ||
    node.type === 'PropertyDefinition'
  )
}

function isInstanceMethodBody(node) {
  if (node.type !== 'FunctionExpression') return false

  const member = node.parent
  return member.type === 'MethodDefinition' && !member.static
}

function isFunctionExpression(node) {
  return !!node && node.type === 'FunctionExpression'
}

function referencesFunction(value, context) {
  if (!value || value.type !== 'Identifier') return false

  const declaration = findDeclaration(value, context)
  if (!declaration || declaration.defs.length !== 1) return false
  if (declaration.references.some(reference => reference.isWrite() && !reference.init)) return false

  return definesFunction(declaration.defs[0].node)
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
