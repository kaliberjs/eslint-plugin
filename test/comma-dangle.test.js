const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('comma-dangle', () => {
  it('(comma-dangle) should report an error for trailing comma in multiline object', async () => {
    const code = `const obj = {
  a: 1,
};`;
    const result = await lint(code);
    assertHasWarning(result, 'comma-dangle');
  });
});
