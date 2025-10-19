const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('keyword-spacing', () => {
  it('(keyword-spacing) should report an error for missing space after keyword', async () => {
    const code = `if(true) {}`;
    const result = await lint(code);
    assertHasWarning(result, 'keyword-spacing');
  });
});
