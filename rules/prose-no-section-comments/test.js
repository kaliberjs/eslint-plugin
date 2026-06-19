const { test } = require('../../machinery/test')

test('prose-no-section-comments', {
  valid: [
    `// Validation\nfunction validateOrder(order) { return order }`,
    `function handleOrder(order) {\n  // TODO (APP-123): remove fallback\n  return order\n}`,
    `function handleOrder(order) {\n  // Why: legacy API rejects empty item arrays.\n  return order\n}`,
    `function handleOrder(order) {\n  // The payment provider requires this retry window.\n  return order\n}`,
    `function handleOrder(order) {\n  // eslint-disable-next-line no-console\n  console.log(order)\n}`,
  ],
  invalid: [
    {
      code: `function handleOrder(order) {\n  // Validate\n  validate(order)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
    {
      code: `function handleOrder(order) {\n  // calculate totals\n  return calculateTotals(order)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
    {
      code: `function handleOrder(order) {\n  /* Save */\n  return saveOrder(order)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
  ],
})
