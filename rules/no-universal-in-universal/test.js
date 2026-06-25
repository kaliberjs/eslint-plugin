const { messages } = require('./')
const { test } = require('../../machinery/test')

// ─── Direct detection (AST-level, via RuleTester) ───────────────────────────

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
    // Non-universal file: no checks at all
    {
      filename: '/project/src/features/Hero.js',
      code: `import Inner from '/features/Inner.universal'\nexport default function Hero() { return <Inner /> }`,
    },
    // Universal file with default import from non-universal
    {
      filename: '/project/src/features/Menu.universal.js',
      code: `import styles from './Menu.css'\nexport default function Menu() { return <div className={styles.root} /> }`,
    },
    // Universal file with namespace import from universal (not rendered)
    {
      filename: '/project/src/features/Wrapper.universal.js',
      code: `import * as Inner from '/features/Inner.universal'\nexport default Inner.Component`,
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
    // Universal file rendering via JSXMemberExpression
    {
      filename: '/project/src/features/Outer.universal.js',
      code: `import * as Inner from '/features/Inner.universal'\nexport default function Outer() { return <Inner.Component /> }`,
      errors: [{ message: messages['universal in universal']('Inner') }],
    },
    // Multiple universal imports, only rendered ones flagged
    {
      filename: '/project/src/features/Outer.universal.js',
      code: `import A from '/features/A.universal'\nimport B from '/features/B.universal'\nexport default function Outer() { return <A /> }`,
      errors: [{ message: messages['universal in universal']('A') }],
    },
  ],
})

// Transitive detection is tested via the comprehensive importGraph.test.js
// which covers: circular deps, diamond deps, deep chains, realistic Kaliber
// project structures, and sneaky nesting via shared buildingBlocks.
