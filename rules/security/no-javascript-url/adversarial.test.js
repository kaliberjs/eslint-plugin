const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-javascript-url.
 *
 * One miss recorded rather than fixed, and it is a documented, deliberate
 * scope limit rather than an oversight — the rule's own top-of-file
 * comment says as much: "The slice is literal-only: a computed value needs
 * taint tracking, which no-dom-xss-sink's registry can grow into later."
 * A javascript: URL assigned to a variable and used through a JSX
 * expression container has no Literal node at the checked position — the
 * Literal only exists at the variable's declaration, whose parent is a
 * VariableDeclarator, not one of the three shapes this rule matches.
 */
test('security-no-javascript-url', merge(
  {
    valid: [
      // ADVERSARIAL MISS, documented as out of scope: a javascript: URL
      // reaching a navigation position through a variable rather than an
      // inline literal.
      "const href = 'javascript:alert(1)'; const C = () => <a href={href}>x</a>",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
