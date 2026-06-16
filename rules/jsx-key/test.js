const { test } = require('../../machinery/test')

test('jsx-key',
  {
    valid: [
      { code: 'fn()' },
      { code: '[1, 2, 3].map(function () {})' },
      { code: '<App />;' },
      { code: '[<App key={0} />, <App key={1} />];' },
      { code: '[1, 2, 3].map(function(x) { return <App key={x} /> });' },
      { code: '[1, 2, 3].map(x => <App key={x} />);' },
      { code: '[1, 2, 3].map(x => { return <App key={x} /> });' },
      { code: '[1, 2, 3].foo(x => <App />);' },
      { code: 'var App = () => <div />;' },
      { code: '[1, 2, 3].map(function(x) { return; });' },
      { code: 'foo(() => <div />);' },
      { code: 'foo(() => <></>);' },
      { code: '<></>;' },
      { code: '<App {...{}} />;' },
      { code: '<App key="keyBeforeSpread" {...{}} />;' },
      { code: '<div key="keyBeforeSpread" {...{}} />;' },
      { code: '[<App />];' },
      { code: '[<App {...key} />];' },
      { code: '[<App key={0}/>, <App />];' },
      { code: '[<></>];' },
    ],
    invalid: [
      {
        code: '[1, 2 ,3].map(function(x) { return <App /> });',
        errors: [{ messageId: 'missingIterKey' }]
      },
      {
        code: '[1, 2 ,3].map(x => <App />);',
        errors: [{ messageId: 'missingIterKey' }]
      },
      {
        code: '[1, 2 ,3].map(x => { return <App /> });',
        errors: [{ messageId: 'missingIterKey' }]
      },
      {
        code: '[1, 2, 3].map(x => <>{x}</>);',
        errors: [{
          messageId: 'missingIterKeyUsePrag',
          data: {
            reactPrag: 'Act',
            fragPrag: 'Frag'
          }
        }]
      },
      {
        code: '[<App {...obj} key="keyAfterSpread" />];',
        output: '[<App key="keyAfterSpread" {...obj} />];',
        errors: [{ messageId: 'keyBeforeSpread' }]
      },
      {
        code: '[<div {...obj} key="keyAfterSpread" />];',
        output: '[<div key="keyAfterSpread" {...obj} />];',
        errors: [{ messageId: 'keyBeforeSpread' }]
      },
      // key after multiple spreads
      {
        code: '[<App {...a} {...b} key="k" />];',
        output: '[<App key="k" {...a} {...b} />];',
        errors: [{ messageId: 'keyBeforeSpread' }]
      },
      // key after spread with regular attrs in between
      {
        code: '[<App {...obj} className="x" key="k" />];',
        output: '[<App key="k" {...obj} className="x" />];',
        errors: [{ messageId: 'keyBeforeSpread' }]
      },
      // key with expression value (not string literal)
      {
        code: '[<App {...obj} key={item.id} />];',
        output: '[<App key={item.id} {...obj} />];',
        errors: [{ messageId: 'keyBeforeSpread' }]
      },
    ]
  })
