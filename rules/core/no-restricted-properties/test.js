const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-restricted-properties')

const ruleTester = new RuleTester()

ruleTester.run('no-restricted-properties', rule, {
  valid: [
    { code: 'foo.bar', options: [{ object: 'foo', property: 'baz' }] },
    { code: 'foo.bar()', options: [{ object: 'foo', property: 'baz' }] },
  ],
  invalid: [
    {
      code: 'foo.baz',
      options: [{ object: 'foo', property: 'baz' }],
      errors: [{ message: "'foo.baz' is restricted from being used." }],
    },
    {
      code: 'foo.baz()',
      options: [{ object: 'foo', property: 'baz' }],
      errors: [{ message: "'foo.baz' is restricted from being used." }],
    },
  ],
})
