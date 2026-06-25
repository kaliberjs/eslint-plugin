# No universal in universal

Disallow rendering `.universal` components inside other `.universal.js` files.

## Why

In `@kaliber/build`, `.universal.js` files create separate client-side hydration boundaries. When you render a universal component inside another universal file, you get nested hydration boundaries — the inner component will be hydrated twice, once as part of the outer boundary and once as its own boundary. This causes duplicate mounting, wasted resources, and potential state conflicts.

Each universal component should be rendered from a regular (non-universal) file, such as a page or a plain component.

## Examples

Example of *incorrect* code:

```jsx
// features/Outer.universal.js
import Inner from '/features/Inner.universal'

export default function Outer() {
  return (
    <div>
      <Inner /> {/* ← nested hydration boundary */}
    </div>
  )
}
```

Example of *correct* code:

```jsx
// pages/Home.js (non-universal)
import Menu from '/features/Menu.universal'

function Home() {
  return <Menu />
}
```

```jsx
// features/Menu.universal.js
import { Button } from '/features/buildingBlocks/Button'

export default function Menu() {
  return <Button />
}
```

## Transitive detection

This rule also detects **transitive** universal nesting — when a `.universal.js` file reaches another `.universal.js` through intermediate non-universal files:

```
Outer.universal.js → Wrapper.js → Inner.universal.js
                                        ↑
                                   caught by transitive check
```

This uses the esbuild metafile that `@kaliber/build` writes to `.kaliber-build/server-metafile.json`. If the metafile doesn't exist (build hasn't run yet), the rule gracefully falls back to direct-only checking.

