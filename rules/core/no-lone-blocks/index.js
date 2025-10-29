const { Linter } = require('eslint');

const linter = new Linter();
const rule = linter.getRules().get('no-lone-blocks');

module.exports = {
  meta: rule.meta,
  create: rule.create,
};
