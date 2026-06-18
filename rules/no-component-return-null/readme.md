# No component return null

Disallow returning `null` from a component.

When a component is rendered universally (client-side rendering), the build tool calls `.slice()` on the component's result. If the component returns `null`, that call throws and rendering breaks. This is easy to miss because the same component renders fine server-side, so the failure only shows up once it is used as a universal/client component.

Instead of returning `null`, return an empty fragment `<></>`, or move the condition up so the parent decides whether to render the component at all.

This rule only targets components — functions whose name starts with an uppercase letter. It does not flag `null` returned from hooks, helper functions, or callbacks (e.g. inside `.map()`), and it does not flag `null` used inside JSX (`{cond ? <X /> : null}`).

## Examples

Examples of *correct* code for this rule:

```jsx
function Card({ prop }) {
  if (!prop) return <></>
  return <div>{prop}</div>
}
```
```jsx
function List({ items }) {
  return <ul>{items.map(item => item ? <li key={item.id} /> : null)}</ul>
}
```
```js
function getValue(prop) {
  if (!prop) return null
  return prop.value
}
```

Examples of *incorrect* code for this rule:

```jsx
function Card({ prop }) {
  if (!prop) return null
  return <div>{prop}</div>
}
```
```jsx
const Card = ({ prop }) => prop ? <div /> : null
```
```jsx
const Card = () => null
```
