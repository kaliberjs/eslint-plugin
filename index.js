module.exports = {
  rules: {
    'component-properties': require('./rules/component-properties'),
    'layout-class-name': require('./rules/layout-class-name'),
    'naming-policy': require('./rules/naming-policy'),
    'no-default-export': require('./rules/no-default-export'),
    'no-relative-parent-import': require('./rules/no-relative-parent-import'),
    'jsx-key': require('./rules/jsx-key'),
    'data-x': require('./rules/data-x')
    // data-x
    // 'require-data-x-on-links-and-buttons': require('./rules/data-x/require-data-x-on-links-and-buttons'),
    // 'data-x-must-be-english': require('./rules/data-x/data-x-must-be-english'),
    // 'require-data-x-context': require('./rules/data-x/require-data-x-context'),
    // 'external-clickout-prefix': require('./rules/data-x/external-clickout-prefix'),
    // 'require-data-x-id-on-lists': require('./rules/data-x/require-data-x-id-on-lists'),
    // 'cta-prepend': require('./rules/data-x/cta-prepend'),
    // 'data-x-action-format': require('./rules/data-x/data-x-action-format'),
    // 'multiple-cta-style-suffix': require('./rules/data-x/multiple-cta-style-suffix'),
    // 'data-x-toggle': require('./rules/data-x/data-x-toggle'),
  }
}
