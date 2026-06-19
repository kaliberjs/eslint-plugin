const pkg = require('./package.json')

const plugin = {
  meta: {
    name: '@kaliber/eslint-plugin',
    version: pkg.version,
  },

  rules: {
    'component-properties': require('./rules/component-properties'),
    'layout-class-name': require('./rules/layout-class-name'),
    'naming-policy': require('./rules/naming-policy'),
    'no-default-export': require('./rules/no-default-export'),
    'no-relative-parent-import': require('./rules/no-relative-parent-import'),
    'jsx-key': require('./rules/jsx-key'),
    'import-sort': require('./rules/import-sort'),
    'position-center': require('./rules/position-center'),

    'data-x-required': require('./rules/data-x-required'),
    'data-x-latin-only': require('./rules/data-x-latin-only'),
    'data-x-clickout-prefix': require('./rules/data-x-clickout-prefix'),
    'data-x-unique-id': require('./rules/data-x-unique-id'),
    'data-x-cta-prefix': require('./rules/data-x-cta-prefix'),
    'data-x-onpage-action-format': require('./rules/data-x-onpage-action-format'),
    'data-x-context': require('./rules/data-x-context'),

    'data-x-toggle-prefix': require('./rules/data-x-toggle-prefix'),
    'data-x-sectioning-elements': require('./rules/data-x-sectioning-elements'),
    'data-x-form-naming': require('./rules/data-x-form-naming'),

    'todo-ticket-reference': require('./rules/todo-ticket-reference'),
  },

  configs: {},
}

// `configs.jsdoc` is opt-in, so eslint-plugin-jsdoc is an optional peer rather than a
// dependency — requiring this plugin must not pull it in for projects that don't use it.
// The getter defers the require until the preset is actually read.
Object.defineProperty(plugin.configs, 'jsdoc', {
  enumerable: true,
  configurable: true,
  get: createJsdocConfig,
})

function createJsdocConfig() {
  let pluginJsdoc
  try {
    pluginJsdoc = require('eslint-plugin-jsdoc')
  } catch {
    throw new Error(
      `configs.jsdoc requires eslint-plugin-jsdoc, which is an optional peer dependency.\n` +
      `Install it in your project: pnpm add -D eslint-plugin-jsdoc`
    )
  }

  return {
    plugins: {
      'jsdoc': pluginJsdoc,
    },
    rules: {
      'jsdoc/require-jsdoc': ['warn', {
        require: {
          FunctionDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
        publicOnly: true,
      }],
      'jsdoc/valid-types': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/no-undefined-types': 'warn',
    },
  }
}

module.exports = plugin
