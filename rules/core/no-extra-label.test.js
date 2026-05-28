const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-extra-label')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-extra-label', rule, {
  valid: [
    `
      outer:
      for (const a of items) {
        for (const b of other) {
          if (b) break outer
        }
      }
    `,
  ],
  invalid: [
    {
      code: `
        label:
        while (true) {
          break label
        }
      `,
      output: `
        label:
        while (true) {
          break
        }
      `,
      errors: [{ messageId: 'unexpected' }],
    },
  ],
})
