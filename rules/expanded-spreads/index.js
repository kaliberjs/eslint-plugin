const docsUrl = require('../../machinery/docsUrl')
const expandStaticSpreads = require('../../machinery/expandStaticSpreads')
const jsxA11y = require('eslint-plugin-jsx-a11y').rules
const react = require('eslint-plugin-react').rules

const readme = docsUrl(__dirname)

module.exports = {
  'jsx-a11y-alt-text': expandStaticSpreads(jsxA11y['alt-text'], readme),
  'jsx-a11y-anchor-has-content': expandStaticSpreads(jsxA11y['anchor-has-content'], readme),
  'jsx-a11y-anchor-is-valid': expandStaticSpreads(jsxA11y['anchor-is-valid'], readme),
  'jsx-a11y-aria-activedescendant-has-tabindex': expandStaticSpreads(jsxA11y['aria-activedescendant-has-tabindex'], readme),
  'jsx-a11y-aria-props': expandStaticSpreads(jsxA11y['aria-props'], readme),
  'jsx-a11y-aria-proptypes': expandStaticSpreads(jsxA11y['aria-proptypes'], readme),
  'jsx-a11y-aria-role': expandStaticSpreads(jsxA11y['aria-role'], readme),
  'jsx-a11y-aria-unsupported-elements': expandStaticSpreads(jsxA11y['aria-unsupported-elements'], readme),
  'jsx-a11y-click-events-have-key-events': expandStaticSpreads(jsxA11y['click-events-have-key-events'], readme),
  'jsx-a11y-heading-has-content': expandStaticSpreads(jsxA11y['heading-has-content'], readme),
  'jsx-a11y-html-has-lang': expandStaticSpreads(jsxA11y['html-has-lang'], readme),
  'jsx-a11y-iframe-has-title': expandStaticSpreads(jsxA11y['iframe-has-title'], readme),
  'jsx-a11y-img-redundant-alt': expandStaticSpreads(jsxA11y['img-redundant-alt'], readme),
  'jsx-a11y-no-access-key': expandStaticSpreads(jsxA11y['no-access-key'], readme),
  'jsx-a11y-no-redundant-roles': expandStaticSpreads(jsxA11y['no-redundant-roles'], readme),
  'jsx-a11y-no-static-element-interactions': expandStaticSpreads(jsxA11y['no-static-element-interactions'], readme),
  'jsx-a11y-role-has-required-aria-props': expandStaticSpreads(jsxA11y['role-has-required-aria-props'], readme),
  'jsx-a11y-role-supports-aria-props': expandStaticSpreads(jsxA11y['role-supports-aria-props'], readme),
  'react-button-has-type': expandStaticSpreads(react['button-has-type'], readme),
  'react-jsx-no-duplicate-props': expandStaticSpreads(react['jsx-no-duplicate-props'], readme),
  'react-no-danger-with-children': expandStaticSpreads(react['no-danger-with-children'], readme),
  'react-void-dom-elements-no-children': expandStaticSpreads(react['void-dom-elements-no-children'], readme),
}
