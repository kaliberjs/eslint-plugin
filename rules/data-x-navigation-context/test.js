const { test } = require('../../machinery/test')

test('data-x-navigation-context', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<a data-x="job-overview" data-x-context="mainnav">Jobs</a>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<a data-x="nav-home" data-x-context="footer">Home</a>' },
    { code: '<a data-x="clickout-linkedin">LinkedIn</a>' },
    { code: '<button data-x="cta-apply">Apply</button>' },
  ],
  invalid: [
    // Note: This rule is informational/soft - we can't reliably detect
    // when navigation links need context without cross-file analysis
    // So we'll keep the tests minimal
  ]
})
