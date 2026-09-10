const { test, merge } = require('../../../machinery/test')

test('security-no-template-autoescape-disabled', merge(
  {
    valid: [
      'nunjucks.configure({ autoescape: true })',
      "env.addFilter('rich', fn)",
      // Sanitizing around a trusted value is the correct escape hatch.
      'sanitized = DOMPurify.sanitize(rich)',
    ],
    invalid: [
      {
        code: 'nunjucks.configure({ autoescape: false })',
        errors: [{ messageId: 'autoescapeDisabled' }],
      },
      {
        code: 'new Handlebars.Environment({ noEscape: true })',
        errors: [{ messageId: 'autoescapeDisabled' }],
      },
      {
        code: 'html = new Handlebars.SafeString(userMarkup)',
        errors: [{ messageId: 'autoescapeDisabled' }],
      },
      {
        code: 'trusted = DomSanitizer.bypassSecurityTrustHtml(markup)',
        errors: [{ messageId: 'autoescapeDisabled' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
