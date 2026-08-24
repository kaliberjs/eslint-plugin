const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const withBrowser = tests => tests.map(test => ({ ...test, languageOptions: { globals: browser } }))

test('security-no-dom-xss-sink', merge(
  {
    // --- the vertical slice: browser source -> parser sink ----------------
    // Browser sources start at 0.9 confidence, so direct flows stay above
    // the 0.8 threshold and use the plain message; only inexact hops
    // (template interpolation, propagators) produce the qualified variant.
    valid: [
      // Constants never reach the analysis.
      'el.innerHTML = "<b>static</b>";',
      // textContent is safe regardless of taint.
      ...withBrowser([
        { code: 'el.textContent = location.search;' },
      ]),
    ],
    invalid: [
      ...withBrowser([
        {
          code: 'el.innerHTML = location.search;',
          errors: [{ messageId: 'domXss' }],
        },
        {
          // Two propagator hops plus the member access land just below the
          // qualification threshold (0.78), so the message names them.
          code: "el.insertAdjacentHTML('beforeend', decodeURIComponent(location.hash.slice(1)))",
          errors: [{ messageId: 'domXssQualified' }],
        },
        {
          code: 'document.write(document.URL);',
          errors: [{ messageId: 'domXss' }],
        },
        {
          // Template interpolation costs one 0.05 hop: 0.9 -> 0.85, still
          // above the qualification threshold.
          code: 'el.outerHTML = `<a href="${location.href}">x</a>`;',
          errors: [{ messageId: 'domXss' }],
        },
      ]),
    ],
  },

  {
    // --- server-side sources reaching DOM sinks ---------------------------
    // Express request data in the same file as a DOM write is unusual (the
    // browser cannot see req), but the registry is global and the flow is
    // real when it happens — e.g. an SSR escape hatch.
    valid: [],
    invalid: [
      {
        // 0.75 confidence, but no *inexact* hop to name — so the plain
        // message fires (same behaviour as the SQL rule's exact flows).
        code: 'function handler(req) { el.innerHTML = req.query.markup }',
        errors: [{ messageId: 'domXss' }],
      },
    ],
  },

  {
    // --- what stays quiet, and why ----------------------------------------
    valid: [
      // Untainted values are no-inner-html's territory, not ours.
      'el.innerHTML = cmsMarkup;',
      // The unknown-call wall: a value passed through an unmodelled function
      // is a documented miss rather than a guess. (Sanitizer modelling will
      // turn some of these into sanitizedFor entries.)
      'el.innerHTML = render(cmsMarkup);',
    ],
    invalid: [],
  },
))
