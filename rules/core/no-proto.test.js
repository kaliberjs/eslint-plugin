const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-proto')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-proto', rule, {
  valid: [
    "const proto = Object.getPrototypeOf(obj)",
    "Object.setPrototypeOf(obj, proto)",
  ],
  invalid: [
    {
      code: "const proto = obj.__proto__",
      errors: [{ messageId: 'unexpectedProto' }],
    },
    {
      code: "obj.__proto__ = proto",
      errors: [{ messageId: 'unexpectedProto' }],
    },
  ],
})
