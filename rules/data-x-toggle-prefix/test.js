const { test } = require('../../machinery/test')

test('data-x-toggle-prefix', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<a data-x="nav-home">Home</a>' },
    { code: '<button data-x="toggle-menu">Menu</button>' },
    { code: '<button data-x="toggle-accordion">Accordion</button>' },
    { code: '<a data-x="toggle-question">Question</a>' },
    { code: '<button data-x="toggle-dropdown">Dropdown</button>' },
    { code: '<button data-x="toggle-faq">FAQ</button>' },
  ],
  invalid: [
    {
      code: '<button data-x="menu">Menu</button>',
      errors: [{ messageId: 'needsTogglePrefix' }]
    },
    {
      code: '<button data-x="accordion-item">Accordion</button>',
      errors: [{ messageId: 'needsTogglePrefix' }]
    },
    {
      code: '<a data-x="question-1">Question</a>',
      errors: [{ messageId: 'needsTogglePrefix' }]
    },
    {
      code: '<button data-x="dropdown">Dropdown</button>',
      errors: [{ messageId: 'needsTogglePrefix' }]
    },
    {
      code: '<button data-x="faq-item" aria-expanded="false">FAQ</button>',
      errors: [{ messageId: 'needsTogglePrefix' }]
    },
  ]
})
