const { test } = require('../../machinery/test')

test('bound-instance-methods', {
  valid: [
    `class A { m = () => {} }`,
    `class A { constructor() { this.m = () => {} } }`,

    // Bound explicitly — the only way for a generator
    `function* gen() {}; class A { constructor() { this.gen = gen.bind(this) } }`,

    // Statics have no instance `this` to lose
    `class A { static m() {} }`,
    `class A { static *m() {} }`,
    `class A { static m = function () {} }`,
    `class A { static m = function* () {} }`,

    // Not methods
    `class A { constructor() {} }`,
    `class A { get x() { return 1 } }`,
    `class A { set x(value) {} }`,

    // Assigning something that is not a function
    `class A { constructor() { const value = 1; this.m = value } }`,
    `class A { constructor(name) { this.name = name } }`,
    `class A { constructor(handler) { this.handler = handler } }`,

    // An arrow has no dynamic `this` to lose
    `const ok = () => {}; class A { constructor() { this.ok = ok } }`,

    // `this` is not the instance — each of these rebinds it
    `class A { constructor() { function f() { this.m = function () {} } } }`,
    `class A { constructor() { const o = { f() { this.m = function () {} } } } }`,
    `class A { static m() { this.n = function () {} } }`,
    `class A { static { this.m = function () {} } }`,
    `function F() { this.m = function () {} }`,

    // Assigning to a nested object, not to the instance
    `class A { constructor() { this.a.b = function () {} } }`,

    // Outside a class entirely
    `const o = { m() {}, f: function () {} }`,
    `const o = { *m() {} }`,
    `function f() {}`,
  ],
  invalid: [
    { code: `class A { m() {} }`, errors: [{ messageId: 'useArrowFunction' }] },
    { code: `class A { async m() {} }`, errors: [{ messageId: 'useArrowFunction' }] },
    { code: `class A { ["m"]() {} }`, errors: [{ messageId: 'useArrowFunction' }] },
    { code: `class A { #m() {} }`, errors: [{ messageId: 'useArrowFunction' }] },
    { code: `class A { m = function () {} }`, errors: [{ messageId: 'useArrowFunction' }] },
    { code: `class A { m = async function () {} }`, errors: [{ messageId: 'useArrowFunction' }] },
    { code: `class A { #m = function () {} }`, errors: [{ messageId: 'useArrowFunction' }] },

    { code: `class A { *m() {} }`, errors: [{ messageId: 'bindGenerator' }] },
    { code: `class A { async *m() {} }`, errors: [{ messageId: 'bindGenerator' }] },
    { code: `class A { m = function* () {} }`, errors: [{ messageId: 'bindGenerator' }] },

    // Assigned to `this`, in every position where `this` is the instance
    {
      code: `class A { constructor() { this.m = function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { constructor() { this.m = async function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { constructor() { this.m = function* () {} } }`,
      errors: [{ messageId: 'bindGenerator' }],
    },
    {
      code: `class A { constructor() { this["m"] = function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { constructor() { this.m ??= function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { get x() { this.m = function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { m = () => { this.n = function () {} } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { m = (() => { this.n = function () {} })() }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },

    // An identifier that resolves to a function in the same file
    {
      code: `class A { constructor() { this.m = f; function f() {} } }`,
      errors: [{ messageId: 'bindReference' }],
    },
    {
      code: `class A { constructor() { this.m = f; function* f() {} } }`,
      errors: [{ messageId: 'bindReference' }],
    },
    {
      code: `const named = function () {}; class A { constructor() { this.m = named } }`,
      errors: [{ messageId: 'bindReference' }],
    },
    {
      code: `function f() {}; class A { m = f }`,
      errors: [{ messageId: 'bindReference' }],
    },
  ],
})
