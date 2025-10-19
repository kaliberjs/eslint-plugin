const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-dupe-class-members', () => {
  it('(no-dupe-class-members) should report an error for duplicate class members', async () => {
    const code = `class A { a() {} a() {} }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-dupe-class-members');
  });
});
