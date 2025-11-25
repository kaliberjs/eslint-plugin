module.exports = {
  rules: {
    'component-properties': require('./rules/component-properties'),
    'layout-class-name': require('./rules/layout-class-name'),
    'naming-policy': require('./rules/naming-policy'),
    'no-default-export': require('./rules/no-default-export'),
    'no-relative-parent-import': require('./rules/no-relative-parent-import'),
    'jsx-key': require('./rules/jsx-key'),
    
    'data-x-required': require('./rules/data-x-required'),
    'data-x-english-only': require('./rules/data-x-english-only'),
    'data-x-navigation-context': require('./rules/data-x-navigation-context'),
    'data-x-clickout-prefix': require('./rules/data-x-clickout-prefix'),
    'data-x-unique-id': require('./rules/data-x-unique-id'),
    'data-x-cta-prefix': require('./rules/data-x-cta-prefix'),
    'data-x-onpage-action-format': require('./rules/data-x-onpage-action-format'),
    'data-x-cta-style-suffix': require('./rules/data-x-cta-style-suffix'),
    'data-x-toggle-prefix': require('./rules/data-x-toggle-prefix'),
    'data-x-dynamic-content': require('./rules/data-x-dynamic-content'),
  }
}
