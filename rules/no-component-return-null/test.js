const { messages } = require('./')
const { test } = require('../../machinery/test')

const desc = 'Replace `null` with an empty fragment `<></>`'

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
        suggestions: [{ desc, output: `function Card({ prop }) { if (!prop) return <></>; return <div /> }` }],
      }],
    },

    // arrow component, early return null
    {
      code: `const Card = ({ prop }) => { if (!prop) return null; return <div /> }`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
        suggestions: [{ desc, output: `const Card = ({ prop }) => { if (!prop) return <></>; return <div /> }` }],
      }],
    },

    // arrow component, implicit null return
    {
      code: `const Card = () => null`,
      errors: [{
        message: messages['no return null'],
        type: 'Literal',
        suggestions: [{ desc, output: `const Card = () => <></>` }],
      }],
    },

    // ternary returning null
    {
      code: `function Card({ prop }) { return prop ? <div /> : null }`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
        suggestions: [{ desc, output: `function Card({ prop }) { return prop ? <div /> : <></> }` }],
      }],
    },

    // arrow component, implicit ternary null return
    {
      code: `const Card = ({ prop }) => prop ? <div /> : null`,
      errors: [{
        message: messages['no return null'],
        type: 'ConditionalExpression',
        suggestions: [{ desc, output: `const Card = ({ prop }) => prop ? <div /> : <></>` }],
      }],
    },

    // component wrapped in forwardRef
    {
      code: `const Card = React.forwardRef(({ prop }) => { if (!prop) return null; return <div /> })`,
      errors: [{
        message: messages['no return null'],
        type: 'ReturnStatement',
        suggestions: [{ desc, output: `const Card = React.forwardRef(({ prop }) => { if (!prop) return <></>; return <div /> })` }],
      }],
    },
  ],
})
