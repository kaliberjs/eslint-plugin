const { firstLetterLowerCase } = require('../../machinery/word')
const { isAnonymousFunction } = require('../../machinery/ast')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'incorrect variable passing': name =>
    `Unexpected JSX attribute passing, expected \`{...{ ${name} }}\``,

  'no setters': name =>
    `Unexpected JSX attribute name, you should not directly pass \`${name}\` as a prop. Instead, pass an \`onXxx\` handler.`,

  'destructure props':
    'Expected destructured props',

  'destructure hook parameter':
    'Expected destructured hook parameter',
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Destructure component props and hook parameters, use spread passing for same-name props, and avoid passing state setters as props',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    return {
      'FunctionDeclaration'(node) {
        reportNonDestructuredProps(node)
        reportNonDestructuredHookParameter(node)
      },
      'VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)': reportNonDestructuredHookParameter,
      'JSXAttribute'(node) {
        reportIncorrectVariablePassing(node)
        reportSetterProps(node)
      },
      'JSXSpreadAttribute'(node) {
        reportDestructuredSetterProps(node)
      }
    }

    function reportNonDestructuredProps(node) {
      const [props] = node.params
      if (isAnonymousFunction(node) || firstLetterLowerCase(node.id.name) || !props || props.type !== 'Identifier') return
      context.report({
        message: messages['destructure props'],
        node: props,
      })
    }

    function reportNonDestructuredHookParameter(node) {
      const { id } = node.type === 'FunctionDeclaration' ? node : node.parent
      const name = id && id.name
      const [first] = node.params
      const parameter = first && first.type === 'AssignmentPattern' ? first.left : first
      if (!isHookName(name) || !parameter || parameter.type !== 'Identifier') return

      const variable = context.sourceCode.getDeclaredVariables(node).find(x => x.name === parameter.name)
      const uses = variable.references.map(x => x.identifier).filter(x => x !== parameter)
      if (!uses.length || !uses.every(isPropertyRead)) return

      context.report({
        message: messages['destructure hook parameter'],
        node: parameter,
      })
    }

    function reportSetterProps(node) {
      const { name } = node.name

      if (isSetter(name)) {
        context.report({
          message: messages['no setters'](name),
          node,
        })
      }
    }

    function reportDestructuredSetterProps(node) {
      if (!node.argument.properties) return

      node.argument.properties
        .filter(x => x.value)
        .forEach(x => {
          if (isSetter(x.value.name)) {
            context.report({
              message: messages['no setters'](x.value.name),
              node,
            })
          }
        })
    }

    function reportIncorrectVariablePassing(node) {
      const { name } = node.name
      if (
        name === 'key' ||
        !node.value ||
        node.value.type !== 'JSXExpressionContainer' ||
        name !== node.value.expression.name
      ) return

      const openingElement = node.parent
      const sameNameProps = openingElement.attributes.filter(attr =>
        attr.type === 'JSXAttribute' &&
        attr.name &&
        attr.value &&
        attr.value.type === 'JSXExpressionContainer' &&
        attr.name.name === attr.value.expression.name &&
        attr.name.name !== 'key'
      )

      context.report({
        message: messages['incorrect variable passing'](sameNameProps.map(a => a.name.name).join(', ')),
        node,
        fix(fixer) {
          const sourceCode = context.sourceCode
          const names = sameNameProps.map(a => a.name.name)
          const spread = `{...{ ${names.join(', ')} }}`

          const fixes = []
          sameNameProps.forEach((attr, i) => {
            if (i === 0) {
              fixes.push(fixer.replaceText(attr, spread))
            } else {
              const tokenBefore = sourceCode.getTokenBefore(attr)
              const start = tokenBefore ? tokenBefore.range[1] : attr.range[0]
              fixes.push(fixer.removeRange([start, attr.range[1]]))
            }
          })
          return fixes
        }
      })
    }
  }
}

function isHookName(name) {
  return /^use[A-Z]/.test(name)
}

/**
 * The parameter is only read as an object: `options.a` or `const { a } = options`.
 * Anything else, such as passing it on, calling a method on it or reading a ref's
 * `current`, is a reason to keep it whole.
 */
function isPropertyRead(identifier) {
  const { parent } = identifier
  if (parent.type === 'VariableDeclarator') return parent.init === identifier && parent.id.type === 'ObjectPattern'
  if (parent.type !== 'MemberExpression' || parent.object !== identifier || parent.computed) return false
  if (['current', 'length'].includes(parent.property.name)) return false

  const { parent: user } = parent
  const isCalled = user.type === 'CallExpression' && user.callee === parent
  const isWritten = (user.type === 'AssignmentExpression' && user.left === parent) || user.type === 'UpdateExpression'

  return !isCalled && !isWritten
}

function isSetter(name) {
  return (
    name &&
    name.length >= 4 &&
    name.startsWith('set') &&
    name[3] === name[3].toUpperCase()
  )
}
