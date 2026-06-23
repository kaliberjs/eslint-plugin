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

    'no-restricted-layer-import': require('./rules/no-restricted-layer-import'),
    'no-nested-component': require('./rules/no-nested-component'),
    'no-universal-in-universal': require('./rules/no-universal-in-universal'),

    'no-duplicate-code': require('./rules/no-duplicate-code'),
  },

  configs: {},
}

plugin.configs.architecture = {
  plugins: {
    '@kaliber': plugin,
  },
  rules: {
    '@kaliber/no-restricted-layer-import': 'error',
    '@kaliber/no-nested-component': ['warn', {
      deny: [
        { parent: 'Container*', child: 'Container*' },
        { parent: 'Heading*', child: 'Heading*' },
      ]
    }],
    '@kaliber/no-universal-in-universal': 'error',
  },
}

module.exports = plugin
