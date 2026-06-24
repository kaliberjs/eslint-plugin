const { test } = require('../../machinery/test')

test('prose-no-section-comments', {
  valid: [
    `// Validation\nfunction validateOrder(order) { return order }`,
    `function handleOrder(order) {\n  // TODO (APP-123): remove fallback\n  return order\n}`,
    `function handleOrder(order) {\n  // Why: legacy API rejects empty item arrays.\n  return order\n}`,
    `function handleOrder(order) {\n  // The payment provider requires this retry window.\n  return order\n}`,
    `function handleOrder(order) {\n  // eslint-disable-next-line no-console\n  console.log(order)\n}`,
    `function handleOrder(order) {\n  // c8 ignore next\n  return order\n}`,
    `function handleOrder(order) {\n  // no default\n  switch (order.status) { default: return order }\n}`,
    `function handleOrder(order) {\n  // This documents a surprising production workaround.\n  return order\n}`,
    `function handleOrder(order) {\n  /** @type {Order} */\n  const normalizedOrder = order\n  return normalizedOrder\n}`,
    `function handleOrder(order) {\n  // APP-123 keeps this branch until the migration finishes.\n  return order\n}`,
    `function handleOrder(order) {\n  // Why: the remote service rejects empty arrays.\n  return order\n}`,
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
    {
      code: `function handleOrder(order) {\n  // Fetch data\n  return fetchOrder(order.id)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
    {
      code: `function handleOrder(order) {\n  // Setup\n  setupOrder(order)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
    {
      code: `function handleOrder(order) {\n  // Render\n  return renderOrder(order)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
    {
      code: `function handleOrder(order) {\n  /* Normalize */\n  return normalizeOrder(order)\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
    {
      code: `function handleOrder(order) {\n  // State\n  const state = getState(order)\n  return state\n}`,
      errors: [{ messageId: 'sectionComment' }],
    },
  ],
})
