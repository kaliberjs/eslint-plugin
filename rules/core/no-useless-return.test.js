const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-useless-return')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

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
