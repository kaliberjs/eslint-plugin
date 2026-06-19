const { test } = require('../../machinery/test')

test('prose-prefer-named-array-callback', {
  valid: [
    `items.filter(isActiveItem)`,
    `items.find(item => item.active)`,
    `items.map(item => item.name)`,
    `items.filter(Boolean)`,
    `items.forEach(item => item.active && notify(item))`,
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
  ],
})
