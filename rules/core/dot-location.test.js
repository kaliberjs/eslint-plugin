const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('dot-location')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('dot-location', rule, {
  valid: [
    `const obj = { a: { b: 2 } }; const x = obj.a.b`,
    `const obj = { a: { b: 2 } }; const x = obj.a.\nb`,
  ],
  invalid: [
    {
      code: `const obj = { a: { b: 2 } }; const x = obj.a\n.b`,
      output: `const obj = { a: { b: 2 } }; const x = obj.a.\nb`,
      errors: [{ message: "Expected dot to be on same line as object." }],
    },
  ],
})
