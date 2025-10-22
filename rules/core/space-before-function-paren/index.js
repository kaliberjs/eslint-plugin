const { Linter } = require('eslint');

const linter = new Linter();
const rule = linter.getRules().get('space-before-function-paren');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
