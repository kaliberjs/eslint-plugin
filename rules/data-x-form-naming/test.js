const { test } = require('../../machinery/test')

test('data-x-form-naming', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<form data-x="search-form">Form</form>' },
    { code: '<form data-x="contact-form">Form</form>' },
    { code: '<form data-x="job-application-form">Form</form>' },
  ],
  invalid: [
    {
      code: '<form data-x="search">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
    {
      code: '<form data-x="contact">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
    {
      code: '<form data-x="application">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
  ]
})
