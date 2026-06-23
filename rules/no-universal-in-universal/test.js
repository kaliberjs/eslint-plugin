const { messages } = require('./')
const { test } = require('../../machinery/test')

test('no-universal-in-universal', {
  valid: [
    // Non-universal file importing and rendering a universal component
    {
      filename: '/project/src/pages/Home.js',
      code: `import Menu from '/features/Menu.universal'\nfunction Home() { return <Menu /> }`,
    },
    // Universal file importing non-universal components
    {
      filename: '/project/src/features/Menu.universal.js',
      code: `import { Button } from '/features/buildingBlocks/Button'\nexport default function Menu() { return <Button /> }`,
    },
    // Universal file importing a universal but not rendering it (re-export)
    {
      filename: '/project/src/features/Wrapper.universal.js',
      code: `import Inner from '/features/Inner.universal'\nexport default Inner`,
    },
  ],
  invalid: [
    // Universal file importing AND rendering another universal component
    {
      filename: '/project/src/features/Outer.universal.js',
      code: `import Inner from '/features/Inner.universal'\nexport default function Outer() { return <div><Inner /></div> }`,
      errors: [{ message: messages['universal in universal']('Inner') }],
    },
    // Universal file with named import from universal
    {
      filename: '/project/src/features/Outer.universal.js',
      code: `import { Inner } from '/features/Inner.universal'\nexport default function Outer() { return <Inner /> }`,
      errors: [{ message: messages['universal in universal']('Inner') }],
    },
  ],
})
