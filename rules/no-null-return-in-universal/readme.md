# No null return in universal

Universal components (files ending in `.universal.js`) are rendered on both the server and client by `@kaliber/build`. Returning `null`, an empty fragment, or a value that can implicitly become falsy crashes the build process.

This rule catches these patterns in any PascalCase function (component) within a `*.universal.js` file:

- `return null`
- `return <></>` (empty fragment)
- `return <React.Fragment></React.Fragment>` (empty named fragment)
- `return condition ? <X /> : null` (ternary with null branch)
- `return condition && <X />` (logical `&&` — returns a falsy value when condition is false)

## What to do instead

Return a non-rendering element:

```jsx
<span hidden />
```

Or wrap conditionals in a ternary with a non-rendering fallback:

```jsx
return show ? <Component /> : <span hidden />
```

## Examples

Examples of *correct* code for this rule:

`Component.universal.js`:
```jsx
export default function Component({ show }) {
  return show ? <Content /> : <span hidden />
}
```

`Component.universal.js`:
```jsx
export default function Component({ children }) {
  return <>{children}</>
}
```

Examples of *incorrect* code for this rule:

`Component.universal.js`:
```jsx
// ✗ returning null
export default function Component({ show }) {
  if (!show) return null
  return <Content />
}
```

`Component.universal.js`:
```jsx
// ✗ returning an empty fragment
export default function Component() {
  return <></>
}
```

`Component.universal.js`:
```jsx
// ✗ ternary with null
export default function Component({ show }) {
  return show ? <Content /> : null
}
```

`Component.universal.js`:
```jsx
// ✗ logical && (returns false when condition is falsy)
export default function Component({ show }) {
  return show && <Content />
}
```
