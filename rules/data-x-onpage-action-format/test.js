const { test } = require('../../machinery/test')

test('data-x-onpage-action-format', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<a data-x="nav-home">Home</a>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<a data-x="scroll-applyform">Apply</a>' },
    { code: '<button data-x="scroll-contact">Contact</button>' },
    { code: '<a data-x="cta-scroll-applyform">Apply</a>' },
    { code: '<button data-x="cta-scroll-form">Scroll</button>' },
    { code: '<a data-x="open-modal">Open</a>' },
    { code: '<button data-x="close-dialog">Close</button>' },
    { code: '<a data-x="expand-section">Expand</a>' },
  ],
  invalid: [
    {
      code: '<a data-x="scroll">Scroll</a>',
      errors: [{ messageId: 'invalidOnpageFormat' }]
    },
    {
      code: '<button data-x="scrollapplyform">Scroll</button>',
      errors: [{ messageId: 'invalidOnpageFormat' }]
    },
    {
      code: '<a data-x="open">Open</a>',
      errors: [{ messageId: 'invalidOnpageFormat' }]
    },
  ]
})
