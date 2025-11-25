const { test } = require('../../machinery/test')

test('data-x-cta-prefix', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<button data-x="apply">Apply</button>' },
    { code: '<a data-x="cta-apply">Apply Now</a>' },
    { code: '<a data-x="cta-submit">Submit</a>' },
    { code: '<a data-x="cta-register">Register</a>' },
    { code: '<a data-x="cta-download">Download</a>' },
    { code: '<a data-x="nav-home">Home</a>' },
    { code: '<a data-x="clickout-linkedin">LinkedIn</a>' },
    { code: '<a data-x="toggle-menu">Menu</a>' },
    { code: '<a data-x="about-us">About</a>' },
  ],
  invalid: [
    {
      code: '<a data-x="apply">Apply Now</a>',
      errors: [{ messageId: 'ctaNeedsPrefix' }]
    },
    {
      code: '<a data-x="submit-application">Submit</a>',
      errors: [{ messageId: 'ctaNeedsPrefix' }]
    },
    {
      code: '<a data-x="register-now">Register</a>',
      errors: [{ messageId: 'ctaNeedsPrefix' }]
    },
    {
      code: '<a data-x="download-brochure">Download</a>',
      errors: [{ messageId: 'ctaNeedsPrefix' }]
    },
    {
      code: '<a data-x="contact-us">Contact</a>',
      errors: [{ messageId: 'ctaNeedsPrefix' }]
    },
  ]
})
