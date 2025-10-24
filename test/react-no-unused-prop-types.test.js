const { describe, it } = require('node:test');
const { lint, assertHasWarning } = require('./test-utils');

describe('react/no-unused-prop-types', () => {
  it('should warn on unused prop types', async () => {
    const result = await lint(`
      import PropTypes from 'prop-types';
      function MyComponent({ foo }) {
        return <div>{foo}</div>;
      }
      MyComponent.propTypes = {
        foo: PropTypes.string,
        bar: PropTypes.string,
      };
    `);
    assertHasWarning(result, 'react/no-unused-prop-types');
  });
});
