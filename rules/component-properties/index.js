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
      'FunctionDeclaration': reportNonDestructuredProps,
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
        .filter(x => x.type === 'Property' && !x.computed)
        .map(x => publicKeyName(x.key))
        .filter(isSetter)
        .forEach(name => {
          context.report({
            message: messages['no setters'](name),
            node,
          })
        })
    }

    function reportIncorrectVariablePassing(node) {
      const openingElement = node.parent
      const group = groupOf(openingElement, node)
      if (!group) return

      context.report({
        message: messages['incorrect variable passing'](group.map(a => a.name.name).join(', ')),
        node,
        fix(fixer) {
          if (group[0] !== node) return null

          const sourceCode = context.sourceCode
          const spread = `{...{ ${group.map(a => a.name.name).join(', ')} }}`
          return group.map((attr, i) => {
            if (i === 0) return fixer.replaceText(attr, spread)
            const tokenBefore = sourceCode.getTokenBefore(attr)
            return fixer.removeRange([tokenBefore ? tokenBefore.range[1] : attr.range[0], attr.range[1]])
          })
        }
      })
    }

    function groupOf(openingElement, node) {
      const duplicated = duplicatedNames(openingElement)
      let group = []
      for (const attr of openingElement.attributes) {
        if (isSameNameProp(attr) && !duplicated.has(attr.name.name)) group.push(attr)
        else if (!movesSafelyPast(attr)) {
          if (group.includes(node)) return group
          group = []
        }
      }
      return group.includes(node) ? group : null
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

function duplicatedNames(openingElement) {
  const seen = new Set(), duplicated = new Set()
  for (const attr of openingElement.attributes) {
    const name = attr.type === 'JSXAttribute' && attr.name?.type === 'JSXIdentifier' && attr.name.name
    if (!name) continue
    if (seen.has(name)) duplicated.add(name)
    seen.add(name)
  }
  return duplicated
}

function isSameNameProp(attr) {
  return (
    attr.type === 'JSXAttribute' &&
    attr.name?.type === 'JSXIdentifier' &&
    attr.name.name !== 'key' &&
    attr.value?.type === 'JSXExpressionContainer' &&
    attr.value.expression.type === 'Identifier' &&
    attr.value.expression.name === attr.name.name
  )
}

// A spread can overwrite the props we move across, and anything but a plain read can observe the
// order we move them in. Both make the merge a behavior change, so they end the group instead.
function movesSafelyPast(attr) {
  if (attr.type !== 'JSXAttribute') return false
  if (!attr.value || attr.value.type === 'Literal') return true
  if (attr.value.type !== 'JSXExpressionContainer') return false
  const { type } = attr.value.expression
  return type === 'Literal' || type === 'Identifier'
}

function publicKeyName(key) {
  return key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : undefined
}
