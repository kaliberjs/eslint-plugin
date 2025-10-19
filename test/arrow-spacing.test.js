const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('arrow-spacing', () => {
  it('(arrow-spacing) should report an error for missing space around arrow', async () => {
    const code = `()=>{}`;
    const result = await lint(code);
    assertHasWarning(result, 'arrow-spacing');
  });
});
