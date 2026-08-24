const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for no-jquery-html-sink.
 *
 * Was firing incorrectly, now fixed: the argument check tested
 * `argument.type === 'Literal'` (and a no-substitution TemplateLiteral)
 * directly to decide "safe," so a const alias of either — exactly as
 * static as the inline form — fell through to "not a literal" and was
 * flagged on demonstrably safe code. Fixed by folding through
 * getStaticValue instead of checking node types by hand.
 */
test('security-no-jquery-html-sink', merge(
  {
    valid: [
      "$('#x').html('<b>static</b>')",
      "$('#x').text(someVar)",
      "const H = '<b>x</b>'; $('#x').html(H)",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
