const { test } = require('../../machinery/test')

test('data-x-cta-style-suffix', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<button data-x="submit">Submit</button>' },
    { code: '<button data-x="apply-primary" className="btn-primary">Apply</button>' },
    { code: '<a data-x="nav-home">Home</a>' },
    { 
      code: `
        <div>
          <button data-x="apply-primary" className="btn-primary">Apply</button>
          <button data-x="apply-secondary" className="btn-secondary">Learn More</button>
        </div>
      `
    },
    { code: '<button data-x="submit-primary" className="primary">Submit</button>' },
  ],
  invalid: [
    {
      code: `
        <div>
          <button data-x="apply" className="btn-primary">Apply</button>
          <button data-x="apply" className="btn-secondary">Learn More</button>
        </div>
      `,
      errors: [
        { messageId: 'needsStyleSuffix' },
        { messageId: 'needsStyleSuffix' }
      ]
    },
    {
      code: `
        <div>
          <button data-x="cta-submit" className="primary">Submit</button>
          <button data-x="cta-submit" className="secondary">Cancel</button>
        </div>
      `,
      errors: [
        { messageId: 'needsStyleSuffix' },
        { messageId: 'needsStyleSuffix' }
      ]
    },
  ]
})
