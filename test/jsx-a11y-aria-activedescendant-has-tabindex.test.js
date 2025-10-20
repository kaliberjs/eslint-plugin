const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('jsx-a11y/aria-activedescendant-has-tabindex', () => {
  it('should warn on aria-activedescendant without tabindex', async () => {
    const result = await lint('<div aria-activedescendant="foo" />');
    assertHasWarning(result, 'jsx-a11y/aria-activedescendant-has-tabindex');
  });
});
