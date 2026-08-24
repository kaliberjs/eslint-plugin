const { test, merge } = require('../../../machinery/test')

test('security-no-dangerously-set-inner-html', merge(
  {
    valid: [
      // The constant-only form is the point of this rule's existence:
      // icon sprites and static markup stay quiet, unlike react/no-danger.
      '<div dangerouslySetInnerHTML={{ __html: "<svg><use href=\\"#icon\\" /></svg>" }} />',
      '<div dangerouslySetInnerHTML={{ __html: `static markup` }} />',
      'React.createElement("div", { dangerouslySetInnerHTML: { __html: "constant" } })',
      // Not the dangerous attribute.
      '<div className="html" />',
    ],
    invalid: [
      {
        code: '<div dangerouslySetInnerHTML={{ __html: htmlFromCms }} />',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
      {
        code: '<article dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }} />',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
      {
        code: '<script dangerouslySetInnerHTML={{ __html: `inline ${value}` }} />',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
      {
        code: 'React.createElement("div", { dangerouslySetInnerHTML: { __html: props.html } })',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
    ],
  },

  {
    // Known false-positive family, documented rather than hidden: JSON-LD
    // built at render time is legitimate but indistinguishable from XSS by
    // syntax alone. Pinned as reported so its status stays explicit.
    valid: [],
    invalid: [
      {
        code: '<script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
    ],
  },
))
