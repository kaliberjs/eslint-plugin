const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-fallthrough', () => {
  it('(no-fallthrough) should report an error for fallthrough in switch', async () => {
    const code = `switch (a) { case 1: console.log(1); case 2: console.log(2); }`;
    const result = await lint(code);
    assertHasWarning(result, 'no-fallthrough');
  });
});
