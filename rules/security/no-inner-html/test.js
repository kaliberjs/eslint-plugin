const { test, merge } = require('../../../machinery/test')

test('security-no-inner-html', merge(
  {
    valid: [
      // Constants of every shape are the point of this rule's exemptions.
      'el.innerHTML = "";',
      "el.innerHTML = '<b>static</b>';",
      'el.innerHTML = `<span class="x">static</span>`;',
      // Pure-literal concatenation folds statically and cannot carry a payload.
      "el.innerHTML = '<' + 'b' + '>' + '</b>';",
      // The safe API is not a sink — this is the remediation the message names.
      'el.textContent = userInput;',
      // Reading innerHTML back is harmless; only the write position matters.
      'const html = el.innerHTML;',
      // Unrelated properties with different names.
      'el.dataset.html = userInput;',
      // insertAdjacentHTML's first argument is a position enum, not HTML.
      "el.insertAdjacentHTML('beforeend', '<b>static</b>');",
    ],
    invalid: [
      {
        code: 'el.innerHTML = userInput;',
        errors: [{ messageId: 'htmlSink' }],
      },
      {
        code: 'el.outerHTML = buildMarkup(userInput);',
        errors: [{ messageId: 'htmlSink' }],
      },
      {
        code: 'el.innerHTML = `<div>${title}</div>`;',
        errors: [{ messageId: 'htmlSink' }],
      },
      {
        code: "el.insertAdjacentHTML('beforeend', markupFromServer);",
        errors: [{ messageId: 'htmlSink' }],
      },
      {
        code: 'document.write(location.hash.slice(1));',
        errors: [{ messageId: 'htmlSink' }],
      },
      {
        code: 'doc.writeln(someValue);',
        errors: [{ messageId: 'htmlSink' }],
      },
      {
        code: "window.document.write('<p>' + value + '</p>');",
        errors: [{ messageId: 'htmlSink' }],
      },
    ],
  },

  {
    // Known false-positive family, pinned as reported-by-design: sanitized
    // values are indistinguishable from raw ones until sanitizer modelling
    // ships in the taint layer (same status as no-dangerously-set-inner-html).
    valid: [],
    invalid: [
      {
        code: 'el.innerHTML = DOMPurify.sanitize(userInput);',
        errors: [{ messageId: 'htmlSink' }],
      },
    ],
  },
))
