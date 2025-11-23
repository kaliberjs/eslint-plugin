const { test } = require('../../machinery/test')
const { messages } = require('./index')

test('data-x', {
  valid: [
    '<a data-x="something" data-x-context="context" />',
    '<button data-x="something" data-x-context="context" />',
    '<div />',
    '<span />',
    '<a data-x="something" data-x-context="context">Content</a>',
    '<button data-x="something" data-x-context="context">Content</button>',
    // Dynamic values
    '<a data-x={someVar} data-x-context="context" />',
    '<a data-x="some-thing" data-x-context="context" />',
    '<a data-x="clickout-linkedin" data-x-context="footer" />',
    // Template string with interpolation
    '<a data-x={`something-${id}`} data-x-context="context" />',
    // String with curlies (simple check)
    '<a data-x="{{job_id}}" data-x-context="context" />',
  ],
  invalid: [
    {
      code: '<a />',
      errors: [{ message: messages['missing data-x'] }]
    },
    {
      code: '<button />',
      errors: [{ message: messages['missing data-x'] }]
    },
    {
      code: '<a data-x="something" />',
      errors: [{ message: messages['missing data-x-context'] }]
    },
    {
      code: '<button data-x="something" />',
      errors: [{ message: messages['missing data-x-context'] }]
    },
    {
      code: '<a data-x="Something" data-x-context="context" />',
      errors: [{ message: messages['invalid data-x format'] }]
    },
    {
      code: '<a data-x="some thing" data-x-context="context" />',
      errors: [{ message: messages['invalid data-x format'] }]
    },
    {
      code: '<a data-x="camelCase" data-x-context="context" />',
      errors: [{ message: messages['invalid data-x format'] }]
    },
  ]
})
