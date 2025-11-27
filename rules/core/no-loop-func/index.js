const { Linter } = require('eslint');

const linter = new Linter();
const rule = linter.getRules().get('no-loop-func');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
