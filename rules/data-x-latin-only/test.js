const { test } = require('../../machinery/test')

test('data-x-latin-only', {
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
      output: '<button data-x="verstuur-formulier">Submit</button>',
      errors: [{ messageId: 'nonLatinDataX' }] // Has space
    },
    {
      code: '<a data-x="über-uns">About</a>',
      output: '<a data-x="uber-uns">About</a>',
      errors: [{ messageId: 'nonLatinDataX' }] // Has umlaut
    },
    {
      code: '<button data-x="hôtel">Hotel</button>',
      output: '<button data-x="hotel">Hotel</button>',
      errors: [{ messageId: 'nonLatinDataX' }] // Has circumflex
    },
    {
      code: '<a data-x="café">Cafe</a>',
      output: '<a data-x="cafe">Cafe</a>',
      errors: [{ messageId: 'nonLatinDataX' }] // Has accent
    },
    // Mixed: some ASCII + some diacritics + spaces
    {
      code: '<button data-x="résumé télécharger">Download</button>',
      output: '<button data-x="resume-telecharger">Download</button>',
      errors: [{ messageId: 'nonLatinDataX' }]
    },
    // Purely non-ASCII → fix returns null (empty string after stripping)
    {
      code: '<a data-x="🎉">Party</a>',
      output: null,
      errors: [{ messageId: 'nonLatinDataX' }]
    },
  ]
})
