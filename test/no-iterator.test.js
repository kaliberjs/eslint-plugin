const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('no-iterator', () => {
  it('should warn on Foo.prototype.__iterator__', async () => {
    const result = await lint('Foo.prototype.__iterator__ = function() {};');
    assertHasWarning(result, 'no-iterator');
  });

  it('should warn on foo.__iterator__', async () => {
    const result = await lint('const foo = {}; foo.__iterator__ = function() {};');
    assertHasWarning(result, 'no-iterator');
  });

  it('should warn on foo["__iterator__"]', async () => {
    const result = await lint('const foo = {}; foo["__iterator__"] = function() {};');
    assertHasWarning(result, 'no-iterator');
  });
});
