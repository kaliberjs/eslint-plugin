const { test } = require('../../machinery/test')

test('data-x-sectioning-elements', {
  valid: [
    { code: '<div>Hello</div>' },
    { code: '<section data-x="hero">Content</section>' },
    { code: '<header data-x="main-header">Header</header>' },
    { code: '<footer data-x="site-footer">Footer</footer>' },
    { code: '<nav data-x="main-nav">Nav</nav>' },
    { code: '<main data-x="main-content">Main</main>' },
    { code: '<aside data-x="sidebar">Sidebar</aside>' },
    { code: '<form data-x="search-form">Form</form>' },
  ],
  invalid: [
    {
      code: '<section>Content</section>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'section' } }]
    },
    {
      code: '<header>Header</header>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'header' } }]
    },
    {
      code: '<footer>Footer</footer>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'footer' } }]
    },
    {
      code: '<nav>Nav</nav>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'nav' } }]
    },
    {
      code: '<main>Main</main>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'main' } }]
    },
    {
      code: '<aside>Sidebar</aside>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'aside' } }]
    },
    {
      code: '<form>Form</form>',
      errors: [{ messageId: 'missingSectioningDataX', data: { element: 'form' } }]
    },
  ]
})
