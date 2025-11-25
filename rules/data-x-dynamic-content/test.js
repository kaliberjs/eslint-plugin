const { test } = require('../../machinery/test')

test('data-x-dynamic-content', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<a data-x="nav-home">Home</a>' },
    { code: '<button data-x={dynamicValue} data-x-context="faq">Toggle</button>' },
    { code: '<a data-x={getValue()} data-x-id={item.id}>Link</a>' },
    { code: '<button data-x="toggle-question" data-x-id={question.id}>Question</button>' },
  ],
  invalid: [
    {
      code: '<button data-x={dynamicValue}>Toggle</button>',
      errors: [{ messageId: 'dynamicContentWarning' }]
    },
    {
      code: '<a data-x={getDataX()}>Link</a>',
      errors: [{ messageId: 'dynamicContentWarning' }]
    },
  ]
})
