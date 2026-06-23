const { test } = require('../../machinery/test')

test('prose-prefer-named-array-callback', {
  valid: [
    `items.filter(isActiveItem)`,
    `items.find(item => item.active)`,
    `items.map(item => item.name)`,
    `items.filter(Boolean)`,
    `items.forEach(item => item.active && notify(item))`,
    `items.reduce((total, item) => total + item.amount, 0)`,
    `items.map(({ name }) => name)`,
    `items.filter(item => item)`,
    `items.every(isValidItem)`,
    `items.some(Boolean)`,
    `items.map(function(item) { return item.name })`,
    `items.find(item => item)`,
    `items.map(item => ({ id: item.id }))`,
    `items.map(item => item.amount)`,
    `items[filter](item => item.active && !item.archived)`,
    `items.flatMap(item => item.children.filter(child => child.visible))`,
  ],
  invalid: [
    {
      code: `items.filter(item => item.active && !item.archived)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.find(item => item.status === 'active')`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.some(function(item) { return item.meta.enabled })`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(item => ({ id: item.id, name: item.name }))`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.every(item => item.status !== 'archived')`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.map(item => item.details.title)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.filter(function(item) { return item.active && item.visible })`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.filter(item => item.active ? item.visible : item.fallbackVisible)`,
      errors: [{ messageId: 'namedCallback' }],
    },
    {
      code: `items.filter(item => { const visible = item.visible; return visible })`,
      errors: [{ messageId: 'namedCallback' }],
    },
  ],
})
