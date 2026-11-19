const { test } = require('../../machinery/test')

test('security-detect-disable-mustache-escape', {
  valid: [
    // --- Setting escapeMarkup to true (not false) ---
    `obj.escapeMarkup = true`,

    // --- Setting escapeMarkup to a non-boolean literal ---
    `obj.escapeMarkup = null`,
    `obj.escapeMarkup = 0`,
    `obj.escapeMarkup = ''`,
    `obj.escapeMarkup = 'false'`,
    `obj.escapeMarkup = 1`,

    // --- Setting escapeMarkup to a non-literal (variable) ---
    `obj.escapeMarkup = someVariable`,
    `obj.escapeMarkup = getConfig()`,
    `obj.escapeMarkup = !true`,

    // --- Different property name ---
    `obj.escape = false`,
    `obj.escapeHtml = false`,
    `obj.markupEscape = false`,
    `obj.disableEscape = false`,

    // --- Compound assignment operator (not '=') ---
    `obj.escapeMarkup += false`,

    // --- Left is not a MemberExpression (plain identifier) ---
    `escapeMarkup = false`,

    // --- Computed property (property type is not Identifier) ---
    `obj['escapeMarkup'] = false`,
    `obj[\`escapeMarkup\`] = false`,

    // --- Not an AssignmentExpression at all ---
    `const escapeMarkup = false`,
    `let escapeMarkup = false`,
    `var escapeMarkup = false`,

    // --- Object literal (not assignment) ---
    `const config = { escapeMarkup: false }`,

    // --- Nested member expression — property is still escapeMarkup ---
    // But right side is not false
    `a.b.escapeMarkup = true`,

    // --- Right is undefined (not a Literal) ---
    `obj.escapeMarkup = undefined`,
  ],
  invalid: [
    // --- Basic case: obj.escapeMarkup = false ---
    {
      code: `obj.escapeMarkup = false`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },

    // --- Various object names ---
    {
      code: `this.escapeMarkup = false`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },
    {
      code: `config.escapeMarkup = false`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },
    {
      code: `module.exports.escapeMarkup = false`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },

    // --- Deeply nested member expression ---
    {
      code: `a.b.c.escapeMarkup = false`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },

    // --- Inside a function ---
    {
      code: `function setup() { options.escapeMarkup = false }`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },

    // --- Inside an if block ---
    {
      code: `if (disable) { opts.escapeMarkup = false }`,
      errors: [{ messageId: 'mustacheEscapeDisabled' }],
    },

    // --- Multiple violations ---
    {
      code: `a.escapeMarkup = false\nb.escapeMarkup = false`,
      errors: [
        { messageId: 'mustacheEscapeDisabled' },
        { messageId: 'mustacheEscapeDisabled' },
      ],
    },
  ],
})
