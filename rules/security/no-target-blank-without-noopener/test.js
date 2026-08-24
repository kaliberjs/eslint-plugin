const { test, merge } = require('../../../machinery/test')

test('security-no-target-blank-without-noopener', merge(
  {
    valid: [
      '<a href="https://x.example" target="_blank" rel="noopener noreferrer">x</a>',
      '<a href="/local">x</a>',
      '<a target="_self">x</a>',
      // Dynamic rel cannot be judged; quiet rather than wrong.
      '<a target="_blank" rel={computedRel}>x</a>',
      'window.open(url, name, "noopener")',
      // Not window.open.
      'fs.open(path, "r")',
    ],
    invalid: [
      {
        code: '<a href="https://x.example" target="_blank">x</a>',
        errors: [{ messageId: 'anchorNoopener' }],
      },
      {
        code: 'window.open(url)',
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
      {
        code: 'window.open(url, "popup")',
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
      {
        code: 'window.open(url, name, "width=500")',
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
