# Component properties

- [Destructure props](#destructure-props)
- [Destructure hook parameters](#destructure-hook-parameters)
- [Variable passing](#variable-passing)

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

## Destructure hook parameters

A hook that takes an options object destructures it in the parameter list, as a component does with its props, for the same reason: the editor can see which options exist.

```js
function useHeadroom(options) {
  return useScroll(options.offset)
}
```

```js
function useHeadroom({ offset }) {
  return useScroll(offset)
}
```

A parameter is only reported when every use reads a property from it. Passing it on whole (including in a dependency array), calling a method on it, reading a ref's `current` or an array's `length`, indexing it or writing to it keeps it whole.

### Examples

Examples of *correct* code for this rule:

```js
function useTest({ option }) { return option }
```
```js
function useTest(options) { return useQuery(options) }
```
```js
function useTest(signal$) { return signal$.get() }
```
```js
function useTest(ref) { return ref.current }
```

Examples of *incorrect* code for this rule:

```js
function useTest(options) { return options.a }
```
```js
function useTest(options = {}) { const { a } = options; return a }
```
```js
const useTest = options => options.a
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
