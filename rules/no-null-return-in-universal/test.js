const { test } = require('../../machinery/test')
const { messages } = require('.')

test('no-null-return-in-universal', {
  valid: [
    {
      // return null in a non-universal file — rule is inactive
      filename: 'Component.js',
      code: `export function Component() { return null }`,
    },
    {
      // returning JSX is fine
      filename: 'Component.universal.js',
      code: `export function Component() { return <div /> }`,
    },
    {
      // lowercase function — not a component
      filename: 'Component.universal.js',
      code: `function helper() { return null }`,
    },
    {
      // fragment with children is fine
      filename: 'Component.universal.js',
      code: `export function Component({ children }) { return <>{children}</> }`,
    },
    {
      // ternary without null is fine
      filename: 'Component.universal.js',
      code: `export function Component({ show }) { return show ? <div /> : <span hidden /> }`,
    },
    {
      // null inside a nested arrow (e.g. .map callback) — not a component return
      filename: 'Component.universal.js',
      code: `
        export function Component({ items }) {
          return <div>{items.map(x => x.visible ? <span /> : null)}</div>
        }
      `,
    },
    {
      // React.Fragment with children is fine
      filename: 'Component.universal.js',
      code: `export function Component({ children }) { return <React.Fragment>{children}</React.Fragment> }`,
    },
    {
      // early return of JSX inside if-guard is fine
      filename: 'Component.universal.js',
      code: `
        export function Component({ loading }) {
          if (loading) return <span hidden />
          return <div>Content</div>
        }
      `,
    },
  ],
  invalid: [
    {
      // return null
      filename: 'Component.universal.js',
      code: `export function Component() { return null }`,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // return empty fragment
      filename: 'Component.universal.js',
      code: `export function Component() { return <></> }`,
      errors: [{ message: messages['no empty fragment return'] }],
    },
    {
      // return empty React.Fragment
      filename: 'Component.universal.js',
      code: `export function Component() { return <React.Fragment></React.Fragment> }`,
      errors: [{ message: messages['no empty fragment return'] }],
    },
    {
      // return empty Fragment (named import)
      filename: 'Component.universal.js',
      code: `export function Component() { return <Fragment></Fragment> }`,
      errors: [{ message: messages['no empty fragment return'] }],
    },
    {
      // ternary with null in alternate
      filename: 'Component.universal.js',
      code: `export function Component({ show }) { return show ? <div /> : null }`,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // ternary with null in consequent
      filename: 'Component.universal.js',
      code: `export function Component({ show }) { return show ? null : <div /> }`,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // ternary with null in both branches
      filename: 'Component.universal.js',
      code: `export function Component({ show }) { return show ? null : null }`,
      errors: [
        { message: messages['no null return'] },
        { message: messages['no null return'] },
      ],
    },
    {
      // nested ternary with null
      filename: 'Component.universal.js',
      code: `export function Component({ a, b }) { return a ? <div /> : b ? <span /> : null }`,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // logical && return
      filename: 'Component.universal.js',
      code: `export function Component({ show }) { return show && <div /> }`,
      errors: [{ message: messages['no logical and return'] }],
    },
    {
      // default export component
      filename: 'Component.universal.js',
      code: `export default function Component() { return null }`,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // early return null inside if-guard
      filename: 'Component.universal.js',
      code: `
        export function Component({ data }) {
          if (!data) return null
          return <div>{data.name}</div>
        }
      `,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // multiple early returns, one is null
      filename: 'Component.universal.js',
      code: `
        export function Component({ status }) {
          if (status === 'loading') return <span hidden />
          if (status === 'error') return null
          return <div>Done</div>
        }
      `,
      errors: [{ message: messages['no null return'] }],
    },
    {
      // early return empty fragment
      filename: 'Component.universal.js',
      code: `
        export function Component({ visible }) {
          if (!visible) return <></>
          return <div>Content</div>
        }
      `,
      errors: [{ message: messages['no empty fragment return'] }],
    },
  ],
})
