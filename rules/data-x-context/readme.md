# data-x-context

Ensures that `<a>` and `<button>` elements with `data-x` also include `data-x-context`.

## Rule Details

This rule enforces that links and buttons using `data-x` also provide `data-x-context` for analytics context tracking.

`data-x-context` values are not restricted by this rule.

### Invalid

```jsx
<a data-x="nav-home">Home</a>
<button data-x="submit">Submit</button>
```

### Valid

```jsx
<a href="/about">About</a>
<button type="button">Toggle</button>
<a data-x="nav-home" data-x-context="mainnav">Home</a>
<button data-x="submit" data-x-context="footer">Submit</button>
```
