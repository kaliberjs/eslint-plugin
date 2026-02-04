# data-x-context

Ensures that all `<a>` and `<button>` elements in page templates include a `data-x-context` attribute.

## Rule Details

This rule enforces that every link and button element includes a `data-x-context` attribute for analytics context tracking.

Optionally, you can restrict `data-x-context` values to a predefined list using `allowedValues`.

### Invalid

```jsx
<a data-x="nav-home">Home</a>
<button data-x="submit">Submit</button>
```

### Valid

```jsx
<a data-x="nav-home" data-x-context="mainnav">Home</a>
<button data-x="submit" data-x-context="footer">Submit</button>
```

### Options

```json
{
  "@kaliber/data-x-context": ["error", {
    "allowedValues": ["mainnav", "subnav", "footer"]
  }]
}
```

With `allowedValues`, this is invalid:

```jsx
<a data-x="nav-home" data-x-context="sidebar">Home</a>
```
