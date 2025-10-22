const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-extend-native')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-extend-native', rule, {
  valid: [
    `const a = {}; a.extra = 55;`,
  ],
  invalid: [
    {
      code: `Object.prototype.extra = 55;`,
      errors: [{ message: "Object prototype is read only, properties should not be added." }],
    },
  ],
})
