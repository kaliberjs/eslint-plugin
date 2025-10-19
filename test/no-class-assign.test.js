const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-class-assign', () => {
  it('(no-class-assign) should report an error for reassigning a class', async () => {
    const code = `class A {}\nA = 1;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-class-assign');
  });
});
