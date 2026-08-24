const { test, merge } = require('../../../machinery/test')

test('security-no-jquery-html-sink', merge(
  {
    valid: [
      "$('#output').text(userValue)",       // .text() is the remediation
      "$el.html('<b>static</b>')",
      "$('.item').remove()",
      // Bare $() with a variable stays out of scope: selectors are the FP trap.
      '$(selector).addClass("x")',
    ],
    invalid: [
      {
        code: "$('#output').html(userValue)",
        errors: [{ messageId: 'jqueryHtmlSink' }],
      },
      {
        code: "$list.append(itemMarkup)",
        errors: [{ messageId: 'jqueryHtmlSink' }],
      },
      {
        code: "$row.replaceWith(template(t))",
        errors: [{ messageId: 'jqueryHtmlSink' }],
      },
      {
        code: "$.parseHTML(location.hash.slice(1))",
        errors: [{ messageId: 'jqueryHtmlSink' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
