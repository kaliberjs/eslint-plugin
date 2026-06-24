const { test } = require('../../machinery/test')

test('prose-no-generic-function-names', {
  valid: [
    `function getActiveSubscriptions(subscriptions) { return subscriptions }`,
    `function extractOrderTotals(orders) { return orders }`,
    `function processDocument(document) { return document }`,
    `const handleSubmit = formData => formData`,
    `const helpers = { normalizeUserInput(input) { return input } }`,
    `function getActiveItems(items) { return items.filter(isActiveItem) }`,
    `function updateSubscriptionStatus(subscription) { return subscription }`,
    `const processCheckoutPayment = payment => payment`,
    `const makeTrackingPayload = event => event`,
    `const helpers = { transformSanityDocument(document) { return document } }`,
    `class ArticleRepository { getArticleBySlug(slug) { return slug } }`,
    `const handlers = { handleClick(event) { return event } }`,
    `const process = value => value`,
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
    {
      code: `function mapAndFilter(items) { return items }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `function reduceAndSort(items) { return items }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `function getItems(items) { return items }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `function updateValue(value) { return value }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `const executeThing = thing => thing`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `const helpers = { runTask(task) { return task } }`,
      options: [{ genericNouns: ['task'] }],
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `const helpers = { sendPayload(payload) { return payload } }`,
      options: [{ genericVerbs: ['send'], genericNouns: ['payload'] }],
      errors: [{ messageId: 'genericFunctionName' }],
    },
    {
      code: `const helpers = { parse_thing(value) { return value } }`,
      errors: [{ messageId: 'genericFunctionName' }],
    },
  ],
})
