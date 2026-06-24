const { test } = require('../../machinery/test')

test('prose-prefer-named-reducer', {
  valid: [
    `items.reduce((sum, item) => sum + item.amount, 0)`,
    `items.reduce((total, item) => total + item.price, 0)`,
    `items.reduce((count, item) => count + 1, 0)`,
    `items.reduce(aggregateOrder, initialOrder)`,
    `items.reduce(toTotalPrice, 0)`,
    `items.reduce((diff, item) => diff - item.discount, total)`,
    `items.reduce((product, item) => product * item.factor, 1)`,
  ],
  invalid: [
    {
      code: `items.reduce((result, item) => { result[item.id] = item; return result }, {})`,
      errors: [{ messageId: 'namedReducer' }],
    },
    {
      code: `items.reduce((acc, item) => item.active ? acc + 1 : acc, 0)`,
      errors: [{ messageId: 'namedReducer' }],
    },
    {
      code: `items.reduce((groups, item) => ({ ...groups, [item.type]: [...(groups[item.type] || []), item] }), {})`,
      errors: [{ messageId: 'namedReducer' }],
    },
    {
      code: `items.reduce((acc, item) => { if (item.valid) acc.push(item.name); return acc }, [])`,
      errors: [{ messageId: 'namedReducer' }],
    },
    {
      code: `items.reduce((acc, item) => acc.concat(item.children), [])`,
      errors: [{ messageId: 'namedReducer' }],
    },
  ],
})
