# data-x-required

Ensures that all `<a>` and `<button>` elements in page templates have a `data-x` attribute.

## Rule Details

This rule enforces that every link and button element includes a `data-x` attribute for analytics and tracking purposes.

### Invalid

```jsx
<a href="#">Link</a>
<button>Click me</button>
```

### Valid

```jsx
<a data-x="nav-home" href="#">Link</a>
<button data-x="submit-form">Click me</button>
```
