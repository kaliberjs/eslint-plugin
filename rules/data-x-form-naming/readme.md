# data-x-form-naming

Forms must have a `data-x` attribute ending with `-form`.

## Rule Details

This rule enforces that `<form>` elements use the `-form` suffix in their `data-x` attribute.

### Invalid

```jsx
<form data-x="search">...</form>
<form data-x="contact">...</form>
```

### Valid

```jsx
<form data-x="search-form">...</form>
<form data-x="contact-form">...</form>
```
