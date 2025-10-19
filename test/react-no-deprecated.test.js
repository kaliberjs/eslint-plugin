const { test } = require('node:test')
const { lint, assertHasWarning } = require('./test-utils.js')

test('(react/no-deprecated) should report an error for using deprecated methods', async () => {
  const result = await lint(`
    import React from 'react';
    import ReactDOM from 'react-dom';

    class MyComponent extends React.Component {
      render() {
        return <div />;
      }
    }

    ReactDOM.render(<MyComponent />, document.getElementById('root'));
  `)
  assertHasWarning(result, 'react/no-deprecated')
})
