const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(no-this-before-super) should report an error for this before super', async () => {
  const result = await lint(`
    class A extends B {
      constructor() {
        this.a = 1;
        super();
      }
    }
  `)
  assertHasWarning(result, 'no-this-before-super')
})
