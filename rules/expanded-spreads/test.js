const assert = require('node:assert/strict')
const nodeTest = require('node:test')
const { Linter } = require('eslint')
const { test } = require('../../machinery/test')
const expandStaticSpreads = require('../../machinery/expandStaticSpreads')

test('jsx-a11y-click-events-have-key-events', {
  valid: [
    `<div {...{ onClick, onKeyDown }} />`,
    `<div {...{ onClick: a, onKeyPress: b }} />`,
    `<div {...props} />`,
  ],
  invalid: [
    {
      code: `<div {...{ onClick }} />`,
      errors: [{ message: 'Visible, non-interactive elements with click handlers must have at least one keyboard listener.' }],
    },
    {
      code: `<div {...{ onClick, ['onKeyDown']: k }} />`,
      errors: 1,
    },
    {
      code: `<div {...props} onClick={a} />`,
      errors: 1,
    },
  ],
})

test('jsx-a11y-no-static-element-interactions', {
  valid: [
    `<button {...{ onClick }} />`,
  ],
  invalid: [
    { code: `<div {...{ onClick, onKeyDown }} />`, errors: 1 },
    { code: `<div {...{ onClick }} />`, errors: 1 },
  ],
})

test('jsx-a11y-alt-text', {
  valid: [`<img {...{ alt: 'x', src: y }} />`],
  invalid: [{ code: `<img {...{ src: y }} />`, errors: 1 }],
})

test('jsx-a11y-anchor-has-content', {
  valid: [`<a {...{ title: t }} />`],
  invalid: [{ code: `<a {...{ href: h }} />`, errors: 1 }],
})

test('jsx-a11y-anchor-is-valid', {
  valid: [`<a {...{ href: h }} />`],
  invalid: [{ code: `<a {...{ href: '#', onClick: x }} />`, errors: 1 }],
})

test('jsx-a11y-aria-activedescendant-has-tabindex', {
  valid: [`<div {...{ 'aria-activedescendant': a, tabIndex: 0 }} />`],
  invalid: [{ code: `<div {...{ 'aria-activedescendant': a }} />`, errors: 1 }],
})

test('jsx-a11y-aria-props', {
  valid: [`<div {...{ 'aria-label': 'x' }} />`],
  invalid: [
    {
      code: `<div {...{ 'aria-foo': 'x' }} />`,
      errors: [{ message: 'aria-foo: This attribute is an invalid ARIA attribute.', line: 1, column: 6, endColumn: 30 }],
    },
  ],
})

test('jsx-a11y-aria-proptypes', {
  valid: [`<div {...{ 'aria-hidden': true }} />`],
  invalid: [{ code: `<div {...{ 'aria-hidden': 'maybe' }} />`, errors: 1 }],
})

test('jsx-a11y-aria-role', {
  valid: [`<div {...{ role: 'button' }} />`],
  invalid: [{ code: `<div {...{ role: 'nope' }} />`, errors: 1 }],
})

test('jsx-a11y-aria-unsupported-elements', {
  valid: [`<div {...{ 'aria-hidden': 'true' }} />`],
  invalid: [{ code: `<meta {...{ 'aria-hidden': 'true' }} />`, errors: 1 }],
})

test('jsx-a11y-heading-has-content', {
  valid: [`<h1>Title</h1>`],
  invalid: [{ code: `<h1 {...{ 'aria-label': l }} />`, errors: 1 }],
})

test('jsx-a11y-html-has-lang', {
  valid: [`<html {...{ lang: 'nl' }} />`],
  invalid: [{ code: `<html {...{ dir: 'ltr' }} />`, errors: 1 }],
})

test('jsx-a11y-iframe-has-title', {
  valid: [`<iframe {...{ title: 'x', src: s }} />`],
  invalid: [{ code: `<iframe {...{ src: s }} />`, errors: 1 }],
})

test('jsx-a11y-img-redundant-alt', {
  valid: [`<img {...{ alt: 'cat' }} />`],
  invalid: [{ code: `<img {...{ alt: 'photo of cat' }} />`, errors: 1 }],
})

test('jsx-a11y-no-access-key', {
  valid: [`<div {...{ tabIndex: 0 }} />`],
  invalid: [{ code: `<div {...{ accessKey: 'a' }} />`, errors: 1 }],
})

test('jsx-a11y-no-redundant-roles', {
  valid: [`<button {...{ role: 'link' }} />`],
  invalid: [{ code: `<button {...{ role: 'button' }} />`, errors: 1 }],
})

test('jsx-a11y-role-has-required-aria-props', {
  valid: [`<div {...{ role: 'checkbox', 'aria-checked': true }} />`],
  invalid: [{ code: `<div {...{ role: 'checkbox' }} />`, errors: 1 }],
})

test('jsx-a11y-role-supports-aria-props', {
  valid: [`<div {...{ role: 'button' }} />`],
  invalid: [{ code: `<div {...{ role: 'button', 'aria-checked': 'true' }} />`, errors: 1 }],
})

test('react-button-has-type', {
  valid: [`<button {...{ type: 'button' }} />`],
  invalid: [{ code: `<button {...{ type: t }} />`, errors: 1 }],
})

test('react-jsx-no-duplicate-props', {
  valid: [`<div {...{ onClick: a }} onKeyDown={b} />`],
  invalid: [{ code: `<div {...{ onClick: a }} onClick={b} />`, errors: 1 }],
})

test('react-no-danger-with-children', {
  valid: [`<div {...{ dangerouslySetInnerHTML: h }} />`],
  invalid: [{ code: `<div {...{ dangerouslySetInnerHTML: h }}>c</div>`, errors: 1 }],
})

test('react-void-dom-elements-no-children', {
  valid: [`<div {...{ children: c }} />`],
  invalid: [{ code: `<img {...{ children: c }} />`, errors: 1 }],
})

function probeAttributes(stock, code) {
  const linter = new Linter()
  const messages = linter.verify(code, {
    plugins: { probe: { rules: { probe: expandStaticSpreads(stock, 'https://example.test/readme.md') } } },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'probe/probe': 'error' },
  })
  return { messages, ast: linter.getSourceCode().ast }
}

nodeTest.test('a spread of a static object is expanded for the stock rule and the source AST is left as written', () => {
  const seen = []
  const stock = {
    meta: { type: 'problem', schema: [], messages: {} },
    create: () => ({
      JSXOpeningElement(node) {
        seen.push(node.attributes.map(attribute => attribute.type))
      },
    }),
  }

  const { messages, ast } = probeAttributes(stock, '<div {...{ onClick, onKeyDown }} />')

  assert.deepStrictEqual(messages, [])
  assert.deepStrictEqual(seen, [['JSXAttribute', 'JSXAttribute']])
  assert.equal(ast.body[0].expression.openingElement.attributes[0].type, 'JSXSpreadAttribute')
})

nodeTest.test('a spread that is not an object literal reaches the stock rule unchanged', () => {
  let received
  const stock = {
    meta: { type: 'problem', schema: [], messages: {} },
    create: () => ({
      JSXOpeningElement(node) {
        received = node.attributes[0]
      },
    }),
  }

  probeAttributes(stock, '<div {...props} />')

  assert.equal(received.type, 'JSXSpreadAttribute')
  assert.equal(received.argument.type, 'Identifier')
})
