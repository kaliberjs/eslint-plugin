const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-dangerously-set-inner-html.
 *
 * The rule's original property lookup required the `{ __html: x }` object to
 * appear as an inline literal directly inside the attribute: it matched
 * `properties.find(p => p.type === 'Property' && !p.computed && ...)` with
 * nothing else. That missed three shapes that are not adversarial tricks so
 * much as ordinary React style — extracting the props object to a variable
 * is routine, not an evasion — which made this a real false-negative risk on
 * unremarkable code, not just crafted attacks. All three are now fixed by
 * resolving one level of identifier/spread indirection and reading computed
 * keys the same way the taint engine already does elsewhere.
 */
test('security-no-dangerously-set-inner-html', merge(
  {
    valid: [],
    invalid: [
      // Was a miss: the props object extracted to a variable before being
      // passed to the attribute. Ordinary code, not an attack.
      {
        code: 'function C({ htmlFromCms }) { const markup = { __html: htmlFromCms }; return <div dangerouslySetInnerHTML={markup} /> }',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
      // Was a miss: __html arrives via a spread rather than as a direct
      // property.
      {
        code: '<div dangerouslySetInnerHTML={{ ...{ __html: htmlFromCms } }} />',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
      // Was a miss: a computed key that is a plain string literal.
      {
        code: '<div dangerouslySetInnerHTML={{ ["__html"]: htmlFromCms }} />',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
      // Same three shapes through the React.createElement call form.
      {
        code: 'const inner = { __html: props.html }; React.createElement("div", { dangerouslySetInnerHTML: inner })',
        errors: [{ messageId: 'nonConstantHtml' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
