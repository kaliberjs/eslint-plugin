const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for no-dangerously-set-inner-html.
 *
 * Companion to the adversarial file: the same indirection (variable
 * extraction, spread, computed keys) that was a false-negative risk for
 * tainted HTML must stay quiet when the HTML is actually constant.
 */
test('security-no-dangerously-set-inner-html', merge(
  {
    valid: [
      // Constant through one level of variable indirection.
      'const markup = { __html: "<svg><use href=\\"#icon\\" /></svg>" }; const C = () => <div dangerouslySetInnerHTML={markup} />',
      // Constant through a spread.
      '<div dangerouslySetInnerHTML={{ ...{ __html: "<svg/>" } }} />',
      // Constant through a computed literal key.
      '<div dangerouslySetInnerHTML={{ ["__html"]: "<svg/>" }} />',
      // Spreading an unrelated props object that has no __html at all must
      // not be misread as a match on the wrong property.
      'const other = { className: "x" }; const C = () => <div {...other} />',
      // A value that cannot be resolved locally (imported from another
      // module) is a documented miss, not a crash — the rule must not throw
      // walking the identifier chain.
      'import markup from "./markup"; const C = () => <div dangerouslySetInnerHTML={markup} />',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
