const globals = require('globals')
const { RuleTester } = require('eslint')
const rule = require('.')

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2020 },
  languageOptions: { globals: globals.node },
})

ruleTester.run('no-loop-func', rule, {
  valid: [
    'for (var i = 0; i < 10; ++i) { (function() {}) }',
    'for (let i = 0; i < 10; ++i) { (function() { console.log(i); }) }',
  ],
  invalid: [
    {
      code: 'for (var i = 0; i < 10; ++i) { (function() { console.log(i); }) }',
      errors: [{ message: "Function declared in a loop contains unsafe references to variable(s) 'i'." }],
    },
  ],
})
