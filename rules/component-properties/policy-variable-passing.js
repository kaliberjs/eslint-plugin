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
    // The last duplicate wins at runtime; merging would pick the wrong one
    `<div a={a} {...overrides} a={a} />`,
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
    // An intervening spread can overwrite, so each side merges on its own
    {
      code: `<div a={a} {...overrides} b={b} />`,
      output: `<div {...{ a }} {...overrides} {...{ b }} />`,
      errors: [
        { message: messages['incorrect variable passing']('a') },
        { message: messages['incorrect variable passing']('b') },
      ]
    },
    // An intervening expression that can run code keeps its evaluation order
    {
      code: `<div a={a} title={compute()} b={b} />`,
      output: `<div {...{ a }} title={compute()} {...{ b }} />`,
      errors: [
        { message: messages['incorrect variable passing']('a') },
        { message: messages['incorrect variable passing']('b') },
      ]
    },
    // A getter read is an intervening expression too
    {
      code: `<div a={a} title={source.title} b={b} />`,
      output: `<div {...{ a }} title={source.title} {...{ b }} />`,
      errors: [
        { message: messages['incorrect variable passing']('a') },
        { message: messages['incorrect variable passing']('b') },
      ]
    },
    // Only the merged group is named, not every same-name prop on the element
    {
      code: `<div a={a} b={b} {...overrides} c={c} />`,
      output: `<div {...{ a, b }} {...overrides} {...{ c }} />`,
      errors: [
        { message: twoProps },
        { message: twoProps },
        { message: messages['incorrect variable passing']('c') },
      ]
    },
  ],
}
