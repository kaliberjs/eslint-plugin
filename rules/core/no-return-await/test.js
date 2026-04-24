const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-return-await')

// Deprecated in ESLint 9 but still functional. Keep testing until removed.
const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('no-return-await', rule, {
  valid: [
    'async function foo() { return bar(); }',
    'async function foo() { await bar(); return; }',
    'async function foo() { const x = await bar(); return x; }',
  ],
  invalid: [
    {
      code: 'async function foo() { return await bar(); }',
      errors: [{ message: 'Redundant use of `await` on a return value.', suggestions: 1 }],
    },
  ],
})
