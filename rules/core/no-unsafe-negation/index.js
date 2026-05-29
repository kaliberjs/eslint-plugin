const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-unsafe-negation')

module.exports = {
  meta: rule.meta,
  create: rule.create,
}
