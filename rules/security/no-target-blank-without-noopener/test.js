const { test, merge } = require('../../../machinery/test')

test('security-no-target-blank-without-noopener', merge(
  {
    // --- anchors are the browser's job now ----------------------------------
    // HTML implies noopener for `target="_blank"` on an anchor. A rule that
    // reports these polices a browser default and buries the window.open
    // findings that still matter.
    valid: [
      '<a href={url} target="_blank">link</a>',
      '<a href="https://x.example" target="_blank">x</a>',
      // Opting back in is an explicit choice, not a lint finding.
      '<a href={url} target="_blank" rel="opener">link</a>',
      '<a href="https://x.example" target="_blank" rel="noopener noreferrer">x</a>',
      '<a href="/local">x</a>',
      '<a target="_self">x</a>',
      '<a target="_blank" rel={computedRel}>x</a>',
      '<form action={url} target="_blank" />',
    ],
    invalid: [],
  },

  {
    // --- window.open still hands over the handle ----------------------------
    valid: [
      "window.open(url, name, 'noopener')",
      "window.open(url, '_blank', 'noopener')",
      "window.open(url, '_blank', 'noopener,noreferrer,width=500')",
      // A const alias of the features string is exactly as readable.
      "const features = 'noopener,width=500'; window.open(url, '_blank', features)",
      // Not window.open.
      "fs.open(path, 'r')",
      'db.open()',
      // A local object named `window` is not the global.
      'const window = { open() {} }; window.open(url)',
      'function render(window) { window.open(url) }',
    ],
    invalid: [
      {
        code: 'window.open(url)',
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
      {
        code: "window.open(url, '_blank')",
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
      {
        code: "window.open(url, 'popup')",
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
      {
        code: "window.open(url, name, 'width=500')",
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
      {
        // Unread is not the same as safe.
        code: "window.open(url, '_blank', featuresFor(size))",
        errors: [{ messageId: 'windowOpenUnknownFeatures' }],
      },
    ],
  },
))
