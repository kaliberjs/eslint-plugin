const { test } = require('../../machinery/test')

test('prose-no-generic-function-names', {
  valid: [
    `function getActiveSubscriptions(subscriptions) { return subscriptions }`,
    `function extractOrderTotals(orders) { return orders }`,
    `function processDocument(document) { return document }`,
    `const handleSubmit = formData => formData`,
    `const helpers = { normalizeUserInput(input) { return input } }`,
  ],
  invalid: [
    {
      code: `function filterAndMap(data) { return data }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `function processData(data) { return data }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `const handleStuff = stuff => stuff`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `const helpers = { processArray(items) { return items } }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `class Processor { transformInput(input) { return input } }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
  ],
})
