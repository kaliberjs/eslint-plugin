const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-new-native-nonconstructor')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 }})

ruleTester.run('no-new-native-nonconstructor', rule, {
  valid: [
    { code: 'var a = Symbol("a");' },
    { code: 'var a = BigInt(9007199254740991);', parserOptions: { ecmaVersion: 2020 } },
  ],
  invalid: [
    {
      code: 'var a = new Symbol("a");',
      errors: [{ message: "`Symbol` cannot be called as a constructor." }],
    },
    {
      code: 'var a = new BigInt(9007199254740991);',
      parserOptions: { ecmaVersion: 2020 },
      errors: [{ message: "`BigInt` cannot be called as a constructor." }],
    },
  ],
})
