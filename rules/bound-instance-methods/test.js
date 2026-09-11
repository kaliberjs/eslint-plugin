const { test } = require('../../machinery/test')

test('bound-instance-methods', {
  valid: [
    `class A { m = () => {} }`,
    `class A { constructor() { this.m = () => {} } }`,

    // Bound explicitly — the only way for a generator
    `function* gen() {}; class A { constructor() { this.gen = gen.bind(this) } }`,
    `class A { m = (function* () {}).bind(this) }`,
    `class A { #value = 42; #m = (function* () { yield this.#value }).bind(this) }`,
    `class A { m = (async function* () {}).bind(this) }`,
    `class A { constructor() { this.m = (function* () {}).bind(this) } }`,

    // A generator has no arrow form, so binding it in the constructor counts
    `class A { constructor() { this.gen = this.gen.bind(this) } *gen() {} }`,
    `class A { constructor() { this.gen = this.gen.bind(this) } async *gen() {} }`,
    `class A { constructor() { this.gen = this.gen.bind(this) } gen = function* () {} }`,
    `class A { constructor() { this.#gen = this.#gen.bind(this) } *#gen() {} }`,
    `class A { constructor() { this['gen'] = this['gen'].bind(this) } *['gen']() {} }`,

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

    // Reassignment makes the declaration's original value unreliable
    `class A { constructor() { let fn = function () {}; fn = fn.bind(this); this.fn = fn } }`,
    `let value = function () {}; value = 42; class A { value = value }`,
    `class A { constructor() { function fn() {}; fn = fn.bind(this); this.fn = fn } }`,
    `class A { constructor() { var value = function () {}; var value = 42; this.value = value } }`,

    // An arrow has no dynamic `this` to lose
    `const ok = () => {}; class A { constructor() { this.ok = ok } }`,

    // `this` is not the instance — each of these rebinds it
    `class A { constructor() { function f() { this.m = function () {} } } }`,
    `class A { constructor() { const o = { f() { this.m = function () {} } } } }`,
    `class A { static m() { this.n = function () {} } }`,
    `class A { static { this.m = function () {} } }`,
    `function F() { this.m = function () {} }`,

    // Computed field names inherit the surrounding `this`
    `function factory() { return class A { [(this.m = function () {}, 'key')] = 0 } }`,
    `class A { static make() { return class B { [(this.m = function () {}, 'key')] = 0 } } }`,
    `class A { constructor() { class B { static ['key'] = (this.m = function () {}, 0) } } }`,

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

    {
      code: `class A { *m() {} }`,
      errors: [{ messageId: 'bindGenerator', data: { example: 'name = (function* () {}).bind(this)' } }],
    },
    {
      code: `class A { async *m() {} }`,
      errors: [{ messageId: 'bindGenerator', data: { example: 'name = (async function* () {}).bind(this)' } }],
    },
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
      errors: [{ messageId: 'bindGenerator', data: { example: 'this.name = (function* () {}).bind(this)' } }],
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
    {
      code: `class A { constructor() { class B { static [(this.m = function () {}, 'key')] = 0 } } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `class A { constructor() { class B { [(this.m = function () {}, 'key')] = 0 } } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    {
      code: `function factory() { return class A { ['key'] = (this.m = function () {}, 0) } }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },

    // Constructor binding does not excuse a regular method — it has an arrow form
    {
      code: `class A { constructor() { this.m = this.m.bind(this) } m() {} }`,
      errors: [{ messageId: 'useArrowFunction' }],
    },
    // ...nor a generator that is not the one being bound
    {
      code: `class A { constructor() { this.other = this.other.bind(this) } *gen() {} }`,
      errors: [{ messageId: 'bindGenerator' }],
    },
    {
      code: `class A { constructor() { this.gen = this.gen.bind(other) } *gen() {} }`,
      errors: [{ messageId: 'bindGenerator' }],
    },
    {
      code: `class A { constructor() { this.gen = this.gen } *gen() {} }`,
      errors: [{ messageId: 'bindGenerator' }],
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
    {
      code: `let f = function () {}; class A { m = f }`,
      errors: [{ messageId: 'bindReference' }],
    },
  ],
})
