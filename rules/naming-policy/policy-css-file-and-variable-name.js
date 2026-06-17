const { messages } = require('.')

module.exports = {
  valid: [
    { filename: 'Test.js', code: `import styles from './Test.css'` },
    { filename: 'Test.js', code: `import x from 'something'` },
    { filename: 'Test.js', code: `import abcStyles from './Other.css'` },
    { filename: 'Test.js', code: `import notStyles from './NotCss'` },
  ],
  invalid: [
    {
      filename: 'Test.js',
      code: `import styles from './Something.css'`,
      output: `import styles from './Test.css'`,
      errors: [{ message: messages['invalid css file name']('./Something.css', './Test.css'), type: 'Literal' }]
    },
    {
      filename: 'Test.js',
      code: `import notStyles from './Test.css'`,
      output: `import styles from './Test.css'`,
      errors: [{ message: messages['invalid styles variable name']('notStyles', 'styles'), type: 'Identifier' }]
    },
    // References in same scope should also be renamed
    {
      filename: 'Test.js',
      code: `import css from './Test.css'\nexport default function Test() { return <div className={css.component} /> }`,
      output: `import styles from './Test.css'\nexport default function Test() { return <div className={styles.component} /> }`,
      errors: [{ message: messages['invalid styles variable name']('css', 'styles'), type: 'Identifier' }]
    },
    // Template file (Foo.bar.js → base is 'Foo')
    {
      filename: 'Foo.bar.js',
      code: `import styles from './Bar.css'`,
      output: `import styles from './Foo.css'`,
      errors: [{ message: messages['invalid css file name']('./Bar.css', './Foo.css'), type: 'Literal' }]
    },
  ]
}
