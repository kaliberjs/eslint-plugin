const { Linter } = require('eslint')
const { RuleTester } = require('eslint')

const linter = new Linter()
const rule = linter.getRules().get('valid-typeof')

const ruleTester = new RuleTester()

ruleTester.run('valid-typeof', rule, {
  valid: [
    `typeof foo === 'string'`,
    `typeof foo === 'object'`,
    `typeof foo === 'function'`,
    `typeof foo === 'undefined'`,
    `typeof foo === 'boolean'`,
    `typeof foo === 'number'`,
    `typeof foo === 'symbol'`,
    `typeof foo === 'bigint'`,
    `typeof foo == 'string'`,
    `'string' === typeof foo`,
    `'object' === typeof foo`,
    `'function' === typeof foo`,
  ],
  invalid: [
    {
      code: `typeof foo === 'strnig'`,
      errors: [{ message: 'Invalid typeof comparison value.' }],
    },
    {
      code: `typeof foo === 'undefimed'`,
      errors: [{ message: 'Invalid typeof comparison value.' }],
    },
    {
      code: `typeof foo === 'nunber'`,
      errors: [{ message: 'Invalid typeof comparison value.' }],
    },
  ],
})
