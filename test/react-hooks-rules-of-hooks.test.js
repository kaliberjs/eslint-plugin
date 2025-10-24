const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react-hooks/rules-of-hooks', () => {
  it('should warn on invalid hook call', async () => {
    const result = await lint(`
      import { useState } from 'react';
      if (true) {
        useState();
      }
    `);
    assertHasWarning(result, 'react-hooks/rules-of-hooks');
  });
});
