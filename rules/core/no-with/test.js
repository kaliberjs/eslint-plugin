const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-with')

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } })

ruleTester.run('no-with', rule, {
  valid: [
    { code: 'foo.bar = 1;' },
  ],
  invalid: [
    {
      code: 'with (foo) { bar = 1; }',
      errors: [{ message: "Unexpected use of 'with' statement." }],
    },
  ],
})
