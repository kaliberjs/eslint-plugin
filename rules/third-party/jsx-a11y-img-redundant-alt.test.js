const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-jsx-a11y').rules['img-redundant-alt']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    }
  }
})

ruleTester.run('jsx-a11y/img-redundant-alt', rule, {
  valid: [
    `<img alt="foo" src="foo.jpg" />`,
  ],
  invalid: [
    {
      code: `<img alt="Photo of foo being weird." src="foo.jpg" />`,
      errors: [{ message: 'Redundant alt attribute. Screen-readers already announce `img` tags as an image. You don’t need to use the words `image`, `photo,` or `picture` (or any specified custom words) in the alt prop.', type: 'JSXOpeningElement' }],
    },
  ],
})
