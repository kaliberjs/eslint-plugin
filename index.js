const pkg = require('./package.json')

const proseRules = {
  'prose-no-opaque-condition': require('./rules/prose-no-opaque-condition'),
  'prose-no-negated-property-chain': require('./rules/prose-no-negated-property-chain'),
  'prose-prefer-named-array-callback': require('./rules/prose-prefer-named-array-callback'),
  'prose-no-magic-condition': require('./rules/prose-no-magic-condition'),
  'prose-no-boolean-literal-arguments': require('./rules/prose-no-boolean-literal-arguments'),
  'prose-predicate-names': require('./rules/prose-predicate-names'),
  'prose-no-section-comments': require('./rules/prose-no-section-comments'),
  'prose-no-generic-function-names': require('./rules/prose-no-generic-function-names'),
  'prose-require-type-predicate-jsdoc': require('./rules/prose-require-type-predicate-jsdoc'),
  'prose-no-opaque-jsx-condition': require('./rules/prose-no-opaque-jsx-condition'),
  'prose-prefer-named-reducer': require('./rules/prose-prefer-named-reducer'),
  'prose-no-explanatory-condition-comments': require('./rules/prose-no-explanatory-condition-comments'),
}

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

    ...proseRules,
  },

  configs: {},
}

const proseCoreRuleNames = [
  'prose-no-boolean-literal-arguments',
  'prose-prefer-named-array-callback',
  'prose-predicate-names',
  'prose-require-type-predicate-jsdoc',
  'prose-no-opaque-jsx-condition',
  'prose-prefer-named-reducer',
]

plugin.configs.prose = {
  plugins: {
    '@kaliber': plugin,
  },
  rules: Object.fromEntries(
    Object.keys(proseRules).map(ruleName => [`@kaliber/${ruleName}`, 'warn'])
  ),
}

plugin.configs.proseCore = {
  plugins: {
    '@kaliber': plugin,
  },
  rules: Object.fromEntries(
    proseCoreRuleNames.map(ruleName => [`@kaliber/${ruleName}`, 'warn'])
  ),
}

module.exports = plugin
