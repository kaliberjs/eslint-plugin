const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/no-redundant-roles', () => {
  it('should warn on redundant roles', async () => {
    const result = await lint('<button role="button" />');
    assertHasWarning(result, 'jsx-a11y/no-redundant-roles');
  });
});
