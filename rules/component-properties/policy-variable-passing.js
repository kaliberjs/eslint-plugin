const { messages } = require('./')

const threeProps = messages['incorrect variable passing']('a, b, c')
const twoProps = messages['incorrect variable passing']('a, b')

module.exports = {
  valid: [
    `<div test1={test2} />`,
    `<div {...{ test1 }} />`,
    `<div test='test' />`,
    `<div test />`,
    `<div key={key} />`,
  ],
  invalid: [
    // Single same-name prop
    {
      code: `<div test1={test1} />`,
      output: `<div {...{ test1 }} />`,
      errors: [ { message: messages['incorrect variable passing']('test1') }]
    },
    // Multiple same-name props → merged into single spread (1 error per matching attr)
    {
      code: `<div a={a} b={b} c={c} />`,
      output: `<div {...{ a, b, c }} />`,
      errors: [
        { message: threeProps },
        { message: threeProps },
        { message: threeProps },
      ]
    },
    // Mixed: same-name props interleaved with normal props
    {
      code: `<div a={a} className="x" b={b} />`,
      output: `<div {...{ a, b }} className="x" />`,
      errors: [
        { message: twoProps },
        { message: twoProps },
      ]
    },
    // key={key} is excluded from merging
    {
      code: `<div key={key} a={a} b={b} />`,
      output: `<div key={key} {...{ a, b }} />`,
      errors: [
        { message: twoProps },
        { message: twoProps },
      ]
    },
    // ref={ref} IS included in merge (not excluded like key)
    {
      code: `<div ref={ref} a={a} />`,
      output: `<div {...{ ref, a }} />`,
      errors: [
        { message: messages['incorrect variable passing']('ref, a') },
        { message: messages['incorrect variable passing']('ref, a') },
      ]
    },
  ],
}
