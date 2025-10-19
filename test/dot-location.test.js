const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('dot-location', () => {
  it('(dot-location) should report an error for invalid dot location', async () => {
    const code = `const x = { a: 1 };\nconst y = x.
a;`;
    const result = await lint(code);
    assertHasWarning(result, 'dot-location');
  });
});
