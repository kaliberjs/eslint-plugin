const { test } = require('../../machinery/test')

test('data-x-required', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<span>Text</span>' },
    { code: '<a data-x="link">Click</a>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<a href="#" data-x="nav-home">Home</a>' },
    { code: '<button type="button" data-x="toggle-menu">Menu</button>' },
    { code: '<a data-x="clickout-linkedin" href="https://linkedin.com">LinkedIn</a>' },
  ],
  invalid: [
    {
      code: '<a href="#">Link</a>',
      errors: [{ messageId: 'missingDataX' }]
    },
    {
      code: '<button>Click me</button>',
      errors: [{ messageId: 'missingDataX' }]
    },
    {
      code: '<a href="/page">Go to page</a>',
      errors: [{ messageId: 'missingDataX' }]
    },
    {
      code: '<button type="submit">Submit</button>',
      errors: [{ messageId: 'missingDataX' }]
    },
  ]
})
