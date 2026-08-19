const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-iterator')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-iterator', rule, {
  valid: [
    'const iter = obj[Symbol.iterator]()',
  ],
  invalid: [
    {
      code: 'obj.__iterator__ = function () {}',
      errors: [{ messageId: 'noIterator' }],
    },
  ],
})
