const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/no-distracting-elements', () => {
  it('should warn on distracting elements', async () => {
    const result = await lint('<marquee />');
    assertHasWarning(result, 'jsx-a11y/no-distracting-elements');
  });
});
