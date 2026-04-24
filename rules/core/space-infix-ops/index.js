const { builtinRules } = require('eslint/use-at-your-own-risk');
const rule = builtinRules.get('space-infix-ops');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
