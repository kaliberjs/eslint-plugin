const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('space-before-function-paren')

module.exports = {
  meta: rule.meta,
  create: rule.create,
}
