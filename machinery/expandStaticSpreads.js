const expandedElements = new WeakMap()

module.exports = function expandStaticSpreads(stockRule, docsUrl) {
  return {
    meta: {
      ...stockRule.meta,
      docs: { ...stockRule.meta.docs, url: docsUrl },
    },

    create(context) {
      return adaptListeners(stockRule.create(context))
    },
  }
}

function adaptListeners(listeners) {
  const adapted = { ...listeners }

  if (listeners.JSXElement) {
    adapted.JSXElement = node => listeners.JSXElement(expandElement(node))
  }

  if (listeners.JSXAttribute) {
    adapted.JSXAttribute = attribute => listeners.JSXAttribute(withExpandedParent(attribute))
  }

  if (listeners.JSXOpeningElement || listeners.JSXAttribute) {
    adapted.JSXOpeningElement = opening => visitOpening(listeners, opening)
  }

  return adapted
}

function visitOpening(listeners, opening) {
  const expanded = expandedOpening(opening)
  listeners.JSXOpeningElement?.(expanded)

  if (!listeners.JSXAttribute) return

  for (const attribute of expanded.attributes) {
    if (!opening.attributes.includes(attribute)) listeners.JSXAttribute(attribute)
  }
}

function withExpandedParent(attribute) {
  const parent = expandedOpening(attribute.parent)
  return parent === attribute.parent ? attribute : { ...attribute, parent }
}

function expandedOpening(opening) {
  return expandElement(opening.parent).openingElement
}

function expandElement(element) {
  if (!expandedElements.has(element)) expandedElements.set(element, buildExpandedElement(element))
  return expandedElements.get(element)
}

function buildExpandedElement(element) {
  const { openingElement } = element
  if (!openingElement.attributes.some(isStaticObjectSpread)) return element

  const expandedElement = { ...element }
  const expandedOpeningElement = { ...openingElement, parent: expandedElement }
  expandedOpeningElement.attributes = openingElement.attributes.flatMap(attribute =>
    expandAttribute(attribute, expandedOpeningElement)
  )
  expandedElement.openingElement = expandedOpeningElement
  return expandedElement
}

function expandAttribute(attribute, opening) {
  if (!isStaticObjectSpread(attribute)) return [attribute]
  return attribute.argument.properties.map(property => syntheticAttribute(property, attribute, opening))
}

function isStaticObjectSpread(attribute) {
  return attribute.type === 'JSXSpreadAttribute'
    && attribute.argument.type === 'ObjectExpression'
    && attribute.argument.properties.every(isStaticProperty)
}

function isStaticProperty(property) {
  return property.type === 'Property'
    && property.kind === 'init'
    && !property.computed
    && staticKeyName(property.key) !== null
}

function staticKeyName(key) {
  if (key.type === 'Identifier') return key.name
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value
  return null
}

function syntheticAttribute(property, spread, opening) {
  const { range, loc } = spread
  const attribute = { type: 'JSXAttribute', name: null, value: null, range, loc, parent: opening }

  attribute.name = { type: 'JSXIdentifier', name: staticKeyName(property.key), range, loc, parent: attribute }
  attribute.value = { type: 'JSXExpressionContainer', expression: property.value, range, loc, parent: attribute }
  return attribute
}
