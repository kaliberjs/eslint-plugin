const { test } = require('../../machinery/test')

test('data-x-unique-id', {
  valid: [
    { code: '<a data-x="nav-home">Home</a>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: 'jobs.map(job => <a key={job.id} data-x="job-detail" data-x-id={job.id}>View</a>)' },
    { code: 'items.map(item => <button key={item.id} data-x="item-action" data-x-id={item.id}>Click</button>)' },
    { code: '<div>{results.map(r => <a key={r.id} data-x="search-result" data-x-id={r.id}>Link</a>)}</div>' },
  ],
  invalid: [
    {
      code: 'jobs.map(job => <a key={job.id} data-x="job-detail">View</a>)',
      errors: [{ messageId: 'needsUniqueId' }]
    },
    {
      code: 'items.map(item => <button key={item.id} data-x="item-action">Click</button>)',
      errors: [{ messageId: 'needsUniqueId' }]
    },
    {
      code: '[1,2,3].map(x => <a key={x} data-x="link">Click</a>)',
      errors: [{ messageId: 'needsUniqueId' }]
    },
  ]
})
