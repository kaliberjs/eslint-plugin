const { messages } = require('./')
const { test } = require('../../machinery/test')

test('match-media-query', {
  valid: [
    `matchMedia('(prefers-reduced-motion: reduce)')`,
    `matchMedia('(min-width: 48em)')`,
    `matchMedia('(hover)')`,
    `matchMedia('screen and (min-width: 48em)')`,
    `matchMedia('(min-width: 48em) and (max-width: 60em)')`,
    `matchMedia('not all and (monochrome)')`,
    `matchMedia('print')`,
    `matchMedia('screen')`,
    `window.matchMedia('(prefers-color-scheme: dark)')`,
    `matchMedia(query)`,
    `matchMedia(\`(min-width: \${width}px)\`)`,
    `window.matchMedia(query)`,
    `mediaApi.matchMedia('hover')`,
  ],

  invalid: [
    {
      code: `matchMedia('prefers-reduced-motion')`,
      errors: [{ message: messages['feature not in parentheses']('prefers-reduced-motion') }],
      output: `matchMedia('(prefers-reduced-motion)')`,
    },
    {
      code: `matchMedia('min-width: 48em')`,
      errors: [{ message: messages['feature not in parentheses']('min-width') }],
      output: `matchMedia('(min-width: 48em)')`,
    },
    {
      code: `window.matchMedia('hover')`,
      errors: [{ message: messages['feature not in parentheses']('hover') }],
      output: `window.matchMedia('(hover)')`,
    },
    {
      code: 'matchMedia(`prefers-color-scheme: dark`)',
      errors: [{ message: messages['feature not in parentheses']('prefers-color-scheme') }],
      output: 'matchMedia(`(prefers-color-scheme: dark)`)',
    },
    {
      code: `matchMedia('screen and min-width: 48em')`,
      errors: [{ message: messages['feature not in parentheses']('min-width') }],
      output: null,
    },
    {
      code: `matchMedia('(min-width: 48em) and hover')`,
      errors: [{ message: messages['feature not in parentheses']('hover') }],
      output: null,
    },

    // real witnesses in rabobank-jobs: wavemakers/BarGraph.js:154, BarGraphInfographic.js:54 and :75,
    // _WavemakersHero.js:177
    {
      code: `immediate: () => window.matchMedia('prefers-reduced-motion')?.matches`,
      errors: [{ message: messages['feature not in parentheses']('prefers-reduced-motion') }],
      output: `immediate: () => window.matchMedia('(prefers-reduced-motion)')?.matches`,
    },
  ]
})
