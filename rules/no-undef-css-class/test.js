const path = require('node:path')

const { messages } = require('./')
const { test } = require('../../machinery/test')

const nested = { filename: path.join(__dirname, 'fixtures', 'Nested.js') }
const flat = { filename: path.join(__dirname, 'fixtures', 'Flat.js') }

test('no-undef-css-class', {
  valid: [
    // The case eslint-plugin-css-modules returns clean on: a class declared inside a nested
    // rule. Reporting nothing there looks identical to having no findings at all.
    { ...nested, code: `import styles from './Nested.css'\nfunction Test() { return <div className={styles.iconWrapperLayout} /> }` },
    { ...nested, code: `import styles from './Nested.css'\nfunction Test() { return <div className={styles.component} /> }` },
    { ...nested, code: `import styles from './Nested.css'\nfunction Test() { return <div className={styles.iconLayout} /> }` },
    { ...nested, code: `import styles from './Nested.css'\nfunction Test() { return <div className={styles.wide} /> }` },
    { ...flat, code: `import styles from './Flat.css'\nfunction Test() { return <div className={cx(styles.component, styles.icon)} /> }` },

    // Undecidable rather than absent: which class this reads is not written down.
    { ...flat, code: `import styles from './Flat.css'\nfunction Test() { return <div className={styles[name]} /> }` },

    // A name that is not the stylesheet's.
    { ...flat, code: `import styles from './Flat.css'\nfunction f() { const styles = other; return styles.anything }` },
    { ...flat, code: `import styles, { named } from './Flat.css'\nnamed.anything` },
    { ...flat, code: `import other from './other.js'\nother.anything` },
  ],
  invalid: [
    {
      ...nested,
      code: `import styles from './Nested.css'\nfunction Test() { return <div className={styles.headingLayout} /> }`,
      errors: [{ message: messages['no such class']('styles', 'headingLayout', './Nested.css') }],
    },
    {
      ...flat,
      code: `import styles from './Flat.css'\nfunction Test() { return <div className={styles.commentedOut} /> }`,
      errors: [{ message: messages['no such class']('styles', 'commentedOut', './Flat.css') }],
    },
    {
      ...flat,
      code: `import styles from './Flat.css'\nfunction Test() { return <div className={styles.notAClass} /> }`,
      errors: [{ message: messages['no such class']('styles', 'notAClass', './Flat.css') }],
    },
    {
      // css-loader exports nothing for a global class, so reading one is undefined.
      ...nested,
      code: `import styles from './Nested.css'\nfunction Test() { return <div className={styles.legacy} /> }`,
      errors: [{ message: messages['no such class']('styles', 'legacy', './Nested.css') }],
    },
    {
      ...flat,
      code: `import sheet from './Flat.css'\nfunction Test() { return <div className={cx(sheet.component, sheet.missing)} /> }`,
      errors: [{ message: messages['no such class']('sheet', 'missing', './Flat.css') }],
    },
    {
      ...flat,
      code: `import styles from './Absent.css'\nfunction Test() { return <div className={styles.component} /> }`,
      errors: [{ message: messages['stylesheet not read']('./Absent.css', 'no such file') }],
    },
  ],
})
