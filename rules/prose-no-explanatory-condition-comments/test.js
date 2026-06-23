const { test } = require('../../machinery/test')

test('prose-no-explanatory-condition-comments', {
  valid: [
    `function test(user) {\n// TODO: refactor this check\nif (user.active) return\n}`,
    `function test(status) {\n// Why: business requirement from PROJ-123\nif (status === 'active') return\n}`,
    `function test(legacy) {\n// eslint-disable-next-line\nif (legacy) return\n}`,
    `function test(value) {\n// @ts-ignore\nif (value) return\n}`,
    `function test(user) { if (user.active) return }`,
    `// Calculate the total before tax\nconst total = price + tax`,
    `function test(value) {\n// Ensure data integrity\n\n\nif (value) return\n}`,
    `function test(status) {\n// FIXME: this should use a predicate\nif (status) return\n}`,
    `function test(isLegacy) {\n// NOTE: edge case for legacy accounts\nif (isLegacy) return\n}`,
    `function test(value) {\n// c8 ignore next\nif (value) return\n}`,
    `function test(value) {\n// istanbul ignore next\nif (value) return\n}`,
    `function test(value) {\n// prettier-ignore\nif (value) return\n}`,
    `function test(response) {\n// HACK: workaround for API bug\nif (response) return\n}`,
    `function test(useLegacy) {\n// warning: deprecated path\nif (useLegacy) return\n}`,
  ],
  invalid: [
    {
      code: `function test(user) {\n// Check if the user is active\nif (user.active) return\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
    {
      code: `function test(form) {\n// Verify that the form is valid\nif (isValid(form)) submit()\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
    {
      code: `function test(visible) {\n// Render if the component is visible\nif (visible) renderPanel()\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
    {
      code: `function test(user) {\n// Show if user has permissions\nif (hasPermissions(user)) showPanel()\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
    {
      code: `function test(input) {\n// Validate if the input is correct\nif (input.valid) process()\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
    {
      code: `function test() {\n// Ensure that the value is present\nwhile (getValue()) continue\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
    {
      code: `function test(status) {\n/* Check whether status is ready */\nif (isReady(status)) proceed()\n}`,
      errors: [{ messageId: 'explanatoryConditionComment' }],
    },
  ],
})
