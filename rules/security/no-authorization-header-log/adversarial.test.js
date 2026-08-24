const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-authorization-header-log.
 *
 * One miss recorded rather than fixed: this rule is purely structural
 * (walkForCredential matches AST shapes, with no data-flow resolution at
 * all — no variable lookup, no scope), so `const headers = req.headers;
 * console.log(headers)` evades it. Fixing this would mean adding the kind
 * of identifier resolution the taint engine already does for the
 * taint-based rules; this rule was written deliberately without it, the
 * same tradeoff as no-javascript-url's documented literal-only scope.
 */
test('security-no-authorization-header-log', merge(
  {
    valid: [
      // ADVERSARIAL MISS, same class as no-javascript-url: the credential
      // reaches the logger through a variable, not an inline expression.
      'function h(req) { const headers = req.headers; console.log(headers) }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
