const { test } = require('../../machinery/test')

test('data-x-context', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<a href="/home">Home</a>' },
    { code: '<button type="button">Menu</button>' },
    { code: '<a data-x="nav-home" data-x-context="mainnav">Home</a>' },
    { code: '<button data-x="toggle-menu" data-x-context="header">Menu</button>' },
    { code: '<button data-x="cta-submit" data-x-context={contextName}>Submit</button>' },
    { code: '<a data-x-context="header">Home</a>' },
  ],
  invalid: [
    {
      code: '<a data-x="nav-home">Home</a>',
      errors: [{ messageId: 'missingDataXContext' }]
    },
    {
      code: '<button data-x="submit">Submit</button>',
      errors: [{ messageId: 'missingDataXContext' }]
    },
  ]
})
