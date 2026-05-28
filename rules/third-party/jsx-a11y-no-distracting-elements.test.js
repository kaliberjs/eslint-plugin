const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['no-distracting-elements']

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } } })

ruleTester.run('jsx-a11y/no-distracting-elements', rule, {
  valid: [
    "<div />",
  ],
  invalid: [
    {
      code: "<marquee />",
      errors: [{ message: 'Do not use <marquee> elements as they can create visual accessibility issues and are deprecated.' }],
    },
    {
      code: "<blink />",
      errors: [{ message: 'Do not use <blink> elements as they can create visual accessibility issues and are deprecated.' }],
    },
  ],
})
