const { test, merge } = require('../../../machinery/test')

test('security-no-dynamic-require', merge(
  {
    valid: [
      "require('fs')",
      "const { exec } = require('child_process')",
      'async function load(name) { return import("./report-generator") }',
      // A no-substitution template is still a literal specifier.
      'require(`./locales/en.json`)',
    ],
    invalid: [
      {
        code: 'function load(name) { return require(`./plugins/${name}`) }',
        errors: [{ messageId: 'dynamicRequire' }],
      },
      {
        code: 'async function load(name) { return import(name) }',
        errors: [{ messageId: 'dynamicRequire' }],
      },
      {
        code: 'const r2 = createRequire(import.meta.url); function load(p) { return createRequire(import.meta.url)(p) }',
        errors: [{ messageId: 'dynamicRequire' }],
      },
      {
        code: 'function load(name) { return require(PLUGIN_MAP[name]) }',
        errors: [{ messageId: 'dynamicRequire' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
