const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-plain-http-url.
 *
 * One miss, now fixed: only Literal nodes were checked, so a URL written
 * as a no-substitution template literal was invisible. One correctness
 * bug, also fixed: the option-key check read a computed key's `.name`
 * directly without checking `.computed`, so `{ [url]: 'http://...' }`
 * was misread as a `url:`-named option because the *variable* referenced
 * by the computed key happened to be named `url` — coincidence, not the
 * actual key. Both switched to the shared getStaticPropertyName helper
 * and a TemplateLiteral visitor mirroring the Literal one.
 */
test('security-no-plain-http-url', merge(
  {
    valid: [
      // The finding no longer follows from a computed key's *variable*
      // name; a real key name is required now.
      'const config = { [url]: "http://example.com" }',
    ],
    invalid: [
      {
        code: 'axios.get(`http://api.example.com`)',
        errors: [{ messageId: 'cleartextRequest' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
