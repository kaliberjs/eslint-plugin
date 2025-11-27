# data-x-english-only

Ensures that `data-x` attribute values are language-independent (English only).

## Rule Details

This rule enforces that `data-x` attribute values contain only English alphanumeric characters, hyphens, and underscores. No special characters or non-English letters are allowed.

### Invalid

```jsx
<a data-x="hoofdpagina">Home</a>
<button data-x="über-uns">About</button>
```

### Valid

```jsx
<a data-x="home-page">Home</a>
<button data-x="about-us">About</button>
```
