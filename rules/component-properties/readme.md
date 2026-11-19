# Component properties

- [Destructure props](#destructure-props)
- [Variable passing](#variable-passing)
- [No setters](#no-setters)

## Destructure props

We require props of components to be destructured, this helps type inference to determine what properties are available. If the editor knows what properties are available it can warn about incorrect properties.

Concretely, the following should be refactored as shown:

```jsx
function MyComponent(props) {
  return <Abc test={props.value} />
}
```

```jsx
function MyComponent({ value }) {
  return <Abc test={value} />
}
```

### Examples

Examples of *correct* code for this rule:

```js
function Test() {}
```
```js
function Test({ prop }) {}
```
```js
function test(props) {}
```

Examples of *incorrect* code for this rule:

```js
function Test(props) {}
```

## Variable passing

This rule is mainly to create a more consistent code base. It however allows to quickly see what properties are passed through.

Concretely, the following should be refactored as shown:

```jsx
function MyComponent({ test }) {
  return <Abc test={test} />
}
```

```jsx
function MyComponent({ test }) {
  return <Abc {...{ test } />
}
```

### Examples

Examples of *correct* code for this rule:

```jsx
<div {...{ test1 }} />
```
```jsx
<div test1={test2} />
```
```jsx
<div test='test' />
```
```jsx
<div test />
```
```jsx
<div key={key} />
```

Examples of *incorrect* code for this rule:

```jsx
<div test1={test1} />
```
```jsx
<div a={a} {...overrides} b={b} />
```

### Grouping limits

Same-name props are merged into one spread only while nothing between them can change the result.
A spread, a duplicate assignment of the same prop, or an attribute value that can run code (a call,
a member read that may be a getter) ends the group, and the props on either side merge separately:

```jsx
<div a={a} {...overrides} b={b} />
// becomes
<div {...{ a }} {...overrides} {...{ b }} />
```

A prop that is assigned twice on the same element has a runtime winner the merge cannot express,
so it is left alone.

## No setters

A state setter should not be passed as a prop; pass an `onXxx` handler instead. The advice follows
the public property name, so `onChange={setState}` and `{...{ onChange: setState }}` are both
accepted, while `setState={...}` and the shorthand `{...{ setState }}` are both reported. A computed
key has no known public name and is not reported.
