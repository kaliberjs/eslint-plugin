const { Linter } = require('eslint');

const linter = new Linter();
const rule = linter.getRules().get('object-shorthand');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
