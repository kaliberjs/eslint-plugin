const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/no-unused-prop-types) should report an error for unused prop types', async () => {
  const result = await lint(`
    import React from 'react';
    import PropTypes from 'prop-types';

    class MyComponent extends React.Component {
      render() {
        return <div />;
      }
    }

    MyComponent.propTypes = {
      a: PropTypes.string,
    };
  `)
  assertHasWarning(result, 'react/no-unused-prop-types')
})
