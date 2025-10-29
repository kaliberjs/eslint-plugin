const { Linter } = require('eslint');

const linter = new Linter();
const rule = linter.getRules().get('semi-spacing');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
