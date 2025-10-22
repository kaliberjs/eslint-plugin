const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-multi-str')

const ruleTester = new RuleTester()

ruleTester.run('no-multi-str', rule, {
  valid: [
    { code: 'var a = "b";' },
    { code: 'var a = "b\\nc";' },
    { code: 'var a = `b\nc`;', parserOptions: { ecmaVersion: 6 } },
  ],
  invalid: [
    {
      code: 'var a = "b\\\nc";',
      errors: [{ message: "Multiline support is limited to browsers supporting ES5 only." }],
    },
  ],
})
