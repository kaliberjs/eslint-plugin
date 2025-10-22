const { Linter } = require('eslint');

const linter = new Linter();
const rule = linter.getRules().get('no-mixed-spaces-and-tabs');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
