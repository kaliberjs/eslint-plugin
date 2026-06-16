const { firstLetterLowerCase } = require('../../machinery/word')
const docsUrl = require('../../machinery/docsUrl')

const messages = {
  'incorrect variable passing': name =>
    `Unexpected JSX attribute passing, expected \`{...{ ${name} }}\``,

  'no setters': name =>
    `Unexpected JSX attribute name, you should not directly pass \`${name}\` as a prop. Instead, pass an \`onXxx\` handler.`,

  'destructure props':
    `Expected destructured props`,
}

module.exports = {
  messages,

  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Destructure component props, use spread passing for same-name props, and avoid passing state setters as props',
      url: docsUrl(__dirname),
    },
  },

  create(context) {
    return {
      [`FunctionDeclaration`]: reportNonDestructuredProps,
      [`JSXAttribute`](node) {
        reportIncorrectVariablePassing(node)
        reportSetterProps(node)
      },
      [`JSXSpreadAttribute`](node) {
        reportDestructuredSetterProps(node)
      }
    }

    function reportNonDestructuredProps(node) {
      const [props] = node.params
      if (firstLetterLowerCase(node.id.name) || !props || props.type !== 'Identifier') return
      context.report({
        message: messages['destructure props'],
        node: props,
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

function isSetter(name) {
  return (
    name &&
    name.length >= 4 &&
    name.startsWith('set') &&
    name[3] === name[3].toUpperCase()
  )
}
