const { test } = require('../../machinery/test')

test('data-x-clickout-prefix', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<a data-x="nav-home" href="/">Home</a>' },
    { code: '<a data-x="nav-about" href="/about">About</a>' },
    { code: '<a data-x="clickout-linkedin" href="https://linkedin.com">LinkedIn</a>' },
    { code: '<a data-x="clickout-twitter" href="https://twitter.com">Twitter</a>' },
    { code: '<a data-x="clickout-facebook" href="http://facebook.com">Facebook</a>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<a data-x="anchor" href="#section">Jump</a>' },
  ],
  invalid: [
    {
      code: '<a data-x="linkedin" href="https://linkedin.com">LinkedIn</a>',
      errors: [{ messageId: 'missingClickoutPrefix' }]
    },
    {
      code: '<a data-x="external-twitter" href="https://twitter.com">Twitter</a>',
      errors: [{ messageId: 'missingClickoutPrefix' }]
    },
    {
      code: '<a data-x="social-facebook" href="http://facebook.com">Facebook</a>',
      errors: [{ messageId: 'missingClickoutPrefix' }]
    },
  ]
})
