const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-unexpected-multiline')

const ruleTester = new RuleTester()

ruleTester.run('no-unexpected-multiline', rule, {
  valid: [
    { code: 'var a = 1;\nvar b = 2;' },
    { code: 'var a = 1; var b = 2;' },
  ],
  invalid: [
    {
      code: 'var a = 1\n[1, 2, 3].forEach(console.log)',
      errors: [{ message: "Unexpected newline between object and [ of property access." }],
    },
  ],
})
