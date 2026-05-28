const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-caller')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-caller', rule, {
  valid: [
    'function foo() {}',
  ],
  invalid: [
    {
      code: 'function foo() { return arguments.caller; }',
      errors: [{ message: 'Avoid arguments.caller.' }],
    },
    {
      code: 'function foo() { return arguments.callee; }',
      errors: [{ message: 'Avoid arguments.callee.' }],
    },
  ],
})
