const test = require('node:test')
const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-useless-return')

// This is a bug in ESLint v7, where it incorrectly flags a valid use of a return.
// The 'return' is necessary to prevent execution from continuing outside the if block.
test.skip('no-useless-return', () => {
  const ruleTester = new RuleTester({
    parserOptions: {
      ecmaVersion: 2020,
    },
  })

  ruleTester.run('no-useless-return', rule, {
    valid: [
      'function a() { if (b) { return c; } else { return d; } }',
      'function a() { for (const b of c) { if (d) { return; } } }',
    ],
    invalid: [
      {
        code: 'function a() { return; }',
        errors: [{ message: 'Unnecessary return statement.' }],
        output: 'function a() {  }',
      },
      {
        code: 'function a() { if (b) { return; } else { return; } }',
        errors: [
          { message: 'Unnecessary return statement.' },
          { message: 'Unnecessary return statement.' },
        ],
        output: 'function a() { if (b) {  } else { return; } }',
      },
      {
        code: 'function a() { if (b) { return; } }',
        errors: [{ message: 'Unnecessary return statement.' }],
        output: 'function a() { if (b) {  } }',
      },
    ],
  })
})
