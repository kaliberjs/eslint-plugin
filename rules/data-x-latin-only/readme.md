# data-x-latin-only

Ensures that `data-x` attribute values use only Latin characters.

## Rule Details

This rule enforces that `data-x` attribute values contain only ASCII alphanumeric characters (a-z, 0-9), hyphens, and underscores. No spaces, accented characters, or non-ASCII characters are allowed.

### Invalid

```jsx
<a data-x="über-uns">About</a>
<button data-x="página-inicio">Home</button>
<a data-x="link to page">Link</a>
```

### Valid

```jsx
<a data-x="about-us">About</a>
<button data-x="home-page">Home</button>
<a data-x="link-to-page">Link</a>
```
