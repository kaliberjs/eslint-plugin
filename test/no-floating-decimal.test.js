const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-floating-decimal', () => {
  it('(no-floating-decimal) should report an error for floating decimal', async () => {
    const code = `const x = .5;`;
    const result = await lint(code);
    assertHasWarning(result, 'no-floating-decimal');
  });
});
