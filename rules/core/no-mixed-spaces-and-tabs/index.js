const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-mixed-spaces-and-tabs')

module.exports = {
  meta: rule.meta,
  create: rule.create,
}
