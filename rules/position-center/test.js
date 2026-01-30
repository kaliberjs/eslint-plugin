const { messages } = require('./')
const { test } = require('../../machinery/test')

test('position-center', {
  valid: [
    // object style: allowed values
    `const styles = { placeContent: 'flex-start' }`,
    `const styles = { 'place-content': 'space-between' }`,

    // other centering APIs are fine
    `const styles = { placeItems: 'center' }`,
    `const styles = { alignItems: 'center', justifyContent: 'center' }`,

    // non-css template literal
    `
      const str = \`
        place-content: center;
      \`
    `,
  ],

  invalid: [
    // object style: camelCase
    {
      code: `const styles = { placeContent: 'center' }`,
      errors: [{
        message: messages['no place-content center'],
        type: 'Literal'
      }]
    },

    // object style: kebab-case
    {
      code: `const styles = { 'place-content': 'center' }`,
      errors: [{
        message: messages['no place-content center'],
        type: 'Literal'
      }]
    },

    // object style: template literal value
    {
      code: "const styles = { placeContent: `center` }",
      errors: [{
        message: messages['no place-content center'],
        type: 'TemplateLiteral'
      }]
    },
  ]
})
