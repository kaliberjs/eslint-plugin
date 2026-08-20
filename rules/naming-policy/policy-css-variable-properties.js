const { messages } = require('./')

module.exports = {
  valid: [
    'styles.test',
    'styles._root',
    'styles._rootAbc',
    {
      filename: 'Test.js',
      code: 'export function Test() { return <div className={styles.component} /> }',
    },
    {
      filename: 'Test.js',
      code: 'export function Test() { return <div className={cx(styles.component, styles.test)} /> }',
    },
    `styles['metaGroup' + expertiseColumns]`,
    'styles[`metaGroup${expertiseColumns}`]',
    'styles[condition ? `test${condition}` : null]',
    'styles[variants.primary]',
    'styles[getVariant()]',
  ],
  invalid: [
    {
      code: 'styles._test',
      errors: [{ message: messages['no styles properties with _']('_test') }]
    },
    {
      code: `styles['_test' + index]`,
      errors: [{ message: messages['no styles properties with _']('_test') }]
    },
    {
      code: 'styles[`_test${index}`]',
      errors: [{ message: messages['no styles properties with _']('_test') }]
    },
    {
      code: 'styles[condition ? `_test${condition}` : null]',
      errors: [{ message: messages['no styles properties with _']('_test') }]
    },
    {
      code: 'styles[variants._test]',
      errors: [{ message: messages['no styles properties with _']('_test') }]
    },
    {
      filename: 'Test.js',
      code: 'export function Test() { return <div className={cx(styles.component, styles._test)} /> }',
      errors: [{ message: messages['no styles properties with _']('_test') }]
    },
  ]
}
