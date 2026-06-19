const { messages } = require('./')
const { test } = require('../../machinery/test')

test('no-component-return-null', {
  valid: [
    // component returning JSX
    `function Card({ prop }) { return <div>{prop}</div> }`,

    // null inside JSX is fine — it is not a component return
    `function Card({ prop }) { return <div>{prop ? <span /> : null}</div> }`,

    // null returned from a callback inside a component
    `function List({ items }) { return <ul>{items.map(item => item ? <li /> : null)}</ul> }`,

    // non-component function (lowercase) may return null
    `function getValue(prop) { if (!prop) return null; return prop.value }`,

    // hooks may return null
    `function useThing() { return null }`,

    // helper function inside a component may return null
    `function Card() { function helper() { return null } return <div /> }`,
  ],

  invalid: [
    // early return null
    {
      code: `function Card({ prop }) { if (!prop) return null; return <div /> }`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
      }],
    },

    // arrow component, early return null
    {
      code: `const Card = ({ prop }) => { if (!prop) return null; return <div /> }`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
      }],
    },

    // arrow component, implicit null return
    {
      code: `const Card = () => null`,
      errors: [{
        message: messages['no return null'],
        type: 'Literal',
      }],
    },

    // ternary returning null
    {
      code: `function Card({ prop }) { return prop ? <div /> : null }`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
      }],
    },

    // arrow component, implicit ternary null return
    {
      code: `const Card = ({ prop }) => prop ? <div /> : null`,
      errors: [{
        message: messages['no return null'],
        type: 'ConditionalExpression',
      }],
    },

    // component wrapped in forwardRef
    {
      code: `const Card = React.forwardRef(({ prop }) => { if (!prop) return null; return <div /> })`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
      }],
    },

    // component wrapped in nested memo(forwardRef(...))
    {
      code: `const Card = React.memo(React.forwardRef(({ prop }) => { if (!prop) return null; return <div /> }))`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
      }],
    },
  ],
})
