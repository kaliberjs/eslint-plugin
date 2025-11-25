const { test } = require('../../machinery/test')

test('data-x-english-only', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<a data-x="home">Home</a>' },
    { code: '<button data-x="submit-form">Submit</button>' },
    { code: '<a data-x="nav-overview">Overview</a>' },
    { code: '<button data-x="clickout-linkedin">LinkedIn</button>' },
    { code: '<a data-x="cta-apply">Apply</a>' },
    { code: '<button data-x="toggle-menu_123">Toggle</button>' },
    { code: '<a data-x="scroll-to-section">Scroll</a>' },
    { code: '<a data-x="hoofdpagina">Home</a>' }, // Dutch words in ASCII are allowed
  ],
  invalid: [
    {
      code: '<button data-x="verstuur formulier">Submit</button>',
      errors: [{ messageId: 'nonEnglishDataX' }] // Has space
    },
    {
      code: '<a data-x="über-uns">About</a>',
      errors: [{ messageId: 'nonEnglishDataX' }] // Has umlaut
    },
    {
      code: '<button data-x="hôtel">Hotel</button>',
      errors: [{ messageId: 'nonEnglishDataX' }] // Has circumflex
    },
    {
      code: '<a data-x="café">Cafe</a>',
      errors: [{ messageId: 'nonEnglishDataX' }] // Has accent
    },
  ]
})
