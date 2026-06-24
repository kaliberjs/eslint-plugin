const { test } = require('../../machinery/test')

test('prose-no-boolean-literal-arguments', {
  valid: [
    `fetchUser(id, { includeInactive: true })`,
    `setEnabled(isEnabled)`,
    `new Toggle({ checked: false })`,
    `fetchUser(id, includeInactive)`,
    `renderModal({ open: true, trapFocus: false })`,
    `new QueryClient({ defaultOptions: { queries: { retry: false } } })`,
    `Boolean(isReady)`,
    `configure(true || false)`,
    `Boolean(true)`,
    `Promise.resolve(false)`,
    `expect(value).toBe(false)`,
    `expect(value).toEqual(true)`,
    `assert.strictEqual(result, false)`,
    `setOpen(false)`,
    `setEnabled(true)`,
    {
      code: `feature.toggle(true)`,
      options: [{ allowCallees: ['feature.toggle'] }],
    },
    {
      code: `new Toggle(false)`,
      options: [{ allowCallees: ['Toggle'] }],
    },
  ],
  invalid: [
    {
      code: `fetchUser(id, true)`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
    {
      code: `fetchUser(id, true, false)`,
      errors: [
        { messageId: 'booleanLiteralArgument' },
        { messageId: 'booleanLiteralArgument' },
      ],
    },
    {
      code: `new Toggle(false)`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
    {
      code: `renderDialog({ title }, false)`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
    {
      code: `feature.toggle(true)`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
    {
      code: `track('submit', true, { formId })`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
    {
      code: `setConfig(true, false)`,
      errors: [
        { messageId: 'booleanLiteralArgument' },
        { messageId: 'booleanLiteralArgument' },
      ],
    },
  ],
})
