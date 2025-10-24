const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('block-spacing', () => {
  it('(block-spacing) should report an error for missing space in block', async () => {
    const code = `if (true) {return false;}`;
    const result = await lint(code);
    assertHasWarning(result, 'block-spacing');
  });
});
