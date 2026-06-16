const { messages } = require('./')
const { test } = require('../../machinery/test')

test('no-relative-parent-import', {
  valid: [
    `import './test'`,
    `import x from '/test'`,
    `import x from './test'`,
    `export { x } from '/test'`,
    `export { x } from './test'`,
    `export * from '/test'`,
    `export * from './test'`,
  ],
  invalid: [
    // Without src root → fix returns null (output: null)
    ...['import', 'import x from', 'export { x } from', 'export * from']
      .map(keyword => ({
        code: `${keyword} '../test'`,
        output: null,
        errors: [{ message: messages['no relative parent import']('../test') }]
      })),

    // With src root → fix resolves to root-slash import
    {
      filename: '/project/src/features/nested/Component.js',
      code: `import x from '../shared/utils'`,
      output: `import x from '/features/shared/utils'`,
      errors: [{ message: messages['no relative parent import']('../shared/utils') }]
    },
    {
      filename: '/project/src/features/deep/nested/Component.js',
      code: `import x from '../../machinery/hooks'`,
      output: `import x from '/features/machinery/hooks'`,
      errors: [{ message: messages['no relative parent import']('../../machinery/hooks') }]
    },
    // Preserves double quotes
    {
      filename: '/project/src/features/nested/Component.js',
      code: `import x from "../shared/utils"`,
      output: `import x from "/features/shared/utils"`,
      errors: [{ message: messages['no relative parent import']('../shared/utils') }]
    },
    // Export with src root
    {
      filename: '/project/src/features/nested/Component.js',
      code: `export { x } from '../shared/utils'`,
      output: `export { x } from '/features/shared/utils'`,
      errors: [{ message: messages['no relative parent import']('../shared/utils') }]
    },
    // Bare side-effect import with src root
    {
      filename: '/project/src/features/nested/Component.js',
      code: `import '../shared/polyfill'`,
      output: `import '/features/shared/polyfill'`,
      errors: [{ message: messages['no relative parent import']('../shared/polyfill') }]
    },
  ]
})
