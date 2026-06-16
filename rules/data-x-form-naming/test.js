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
      output: '<form data-x="search-form">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
    {
      code: '<form data-x="contact">Form</form>',
      output: '<form data-x="contact-form">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
    {
      code: '<form data-x="application">Form</form>',
      output: '<form data-x="application-form">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
    // Edge case: bare 'form' → appends '-form' producing 'form-form'
    {
      code: '<form data-x="form">Form</form>',
      output: '<form data-x="form-form">Form</form>',
      errors: [{ messageId: 'formNameSuffix' }]
    },
  ]
})
