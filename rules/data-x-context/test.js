const { test } = require('../../machinery/test')

test('data-x-context', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<a data-x="nav-home" data-x-context="mainnav">Home</a>' },
    { code: '<button data-x="toggle-menu" data-x-context="header">Menu</button>' },
    {
      code: '<a data-x="nav-home" data-x-context="mainnav">Home</a>',
      options: [{ allowedValues: ['mainnav', 'subnav', 'footer'] }]
    },
    {
      code: '<button data-x="cta-submit" data-x-context={contextName}>Submit</button>',
      options: [{ allowedValues: ['mainnav', 'subnav', 'footer'] }]
    },
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
    {
      code: '<a data-x="nav-home" data-x-context="sidebar">Home</a>',
      options: [{ allowedValues: ['mainnav', 'subnav', 'footer'] }],
      errors: [
        {
          messageId: 'invalidDataXContext',
          data: {
            value: 'sidebar',
            allowedValues: 'mainnav, subnav, footer'
          }
        }
      ]
    },
  ]
})
