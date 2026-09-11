const { test } = require('../../machinery/test')

test('bound-instance-methods', {
  valid: [
    `class A { ok = () => {} }`,
    `class A { constructor() { this.ok = () => {} } }`,

    // Bound explicitly — the only way for a generator
    `function* agen() {}; class A { constructor() { this.agen = agen.bind(this) } }`,

    // Statics have no instance `this`
    `class A { static make() {} }`,
    `class A { static *make() {} }`,
    `class A { static create = function () {} }`,
    `class A { static create = function* () {} }`,

    // Not methods
    `class A { constructor() {} }`,
    `class A { get x() { return 1 } }`,
    `class A { set x(value) {} }`,

    // Assigning a non-function is fine
    `class A { constructor() { const value = 1; this.good = value } }`,
    `class A { constructor(name) { this.name = name } }`,

    // An arrow has no dynamic `this` to lose
    `const ok = () => {}; class A { constructor() { this.ok = ok } }`,

    // Outside a class entirely
    `const o = { m() {}, f: function () {} }`,
    `function f() {}`,
  ],
  invalid: [
    {
      code: `class A { bad() {} }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { worse = function () {} }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { constructor() { this.bad = function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { *gen() {} }`,
      errors: [{ messageId: 'bindGenerator' }],
    },
    {
      code: `class A { agen = function* () {} }`,
      errors: [{ messageId: 'bindGenerator' }],
    },
    {
      code: `class A { constructor() { this.gen = function* () {} } }`,
      errors: [{ messageId: 'bindGenerator' }],
    },
    {
      code: `class A { constructor() { this.bad = value; function value() {} } }`,
      errors: [{ messageId: 'bindReference' }],
    },
    {
      code: `class A { constructor() { this.gen = gen; function* gen() {} } }`,
      errors: [{ messageId: 'bindReference' }],
    },
    {
      code: `const named = function () {}; class A { constructor() { this.bad = named } }`,
      errors: [{ messageId: 'bindReference' }],
    },
    {
      code: `function value() {}; class A { bad = value }`,
      errors: [{ messageId: 'bindReference' }],
    },
  ],
})
