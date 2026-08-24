const { test, merge } = require('../../../machinery/test')

test('security-no-javascript-url', merge(
  {
    valid: [
      '<a href="/real/page">go</a>',
      '<a href={computedHref}>go</a>',
      "<Link to='/somewhere'>go</Link>",
      // A string mentioning the scheme in a non-URL position.
      `const note = 'javascript: is dangerous'`,
    ],
    invalid: [
      {
        code: `<a href="javascript:void(open())">go</a>`,
        errors: [{ messageId: 'javascriptUrl' }],
      },
      {
        code: `<iframe src="javascript:render()" />`,
        errors: [{ messageId: 'javascriptUrl' }],
      },
      {
        code: `React.createElement('a', { href: 'javascript:track()' })`,
        errors: [{ messageId: 'javascriptUrl' }],
      },
      {
        code: `el.href = 'JAVASCRIPT:x'`,
        errors: [{ messageId: 'javascriptUrl' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
