const path = require('node:path')

const { messages } = require('./')
const { test } = require('../../machinery/test')

const fixtures = path.join(__dirname, '..', 'no-undef-css-class', 'fixtures')
const nested = { filename: path.join(fixtures, 'Nested.js') }
const flat = { filename: path.join(fixtures, 'Flat.js') }

// Nested.css defines: component, iconWrapperLayout, iconContainer, iconLayout, wide
const all = `styles.component, styles.iconWrapperLayout, styles.iconContainer, styles.iconLayout, styles.wide`

test('no-unused-css-class', {
  valid: [
    { ...nested, code: `import styles from './Nested.css'\nconst used = [${all}]` },
    { ...flat, code: `import styles from './Flat.css'\nconst used = [styles.component, styles.icon]` },

    // Undecidable, not clean: any class could be the one a computed read reaches.
    { ...nested, code: `import styles from './Nested.css'\nconst used = styles[name]` },
    { ...nested, code: `import styles from './Nested.css'\nconst used = { ...styles }` },
    { ...nested, code: `import styles from './Nested.css'\nconst used = Object.keys(styles)` },

    // A stylesheet several components share cannot be judged from one of them.
    {
      ...nested,
      code: `import styles from './Nested.css'\nconst used = styles.component`,
      options: [{ ignore: ['**/fixtures/Nested.css'] }],
    },

    // Reported by no-undef-css-class; not repeated here.
    { ...flat, code: `import styles from './Absent.css'\nconst used = styles.component` },
  ],
  invalid: [
    {
      ...flat,
      code: `import styles from './Flat.css'\nconst used = styles.component`,
      errors: [{ message: messages['unused classes']('./Flat.css', ['icon']) }],
    },
    {
      ...nested,
      code: `import styles from './Nested.css'\nconst used = [styles.component, styles.iconContainer]`,
      errors: [{ message: messages['unused classes']('./Nested.css', ['iconWrapperLayout', 'iconLayout', 'wide']) }],
    },
  ],
})
