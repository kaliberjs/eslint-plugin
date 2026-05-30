# data-x-clickout-prefix

External clickout links must use the "clickout-" prefix in their `data-x` attribute.

## Rule Details

This rule enforces that links to external websites (those starting with `http://` or `https://`) use the "clickout-" prefix in their `data-x` attribute for proper tracking.

### Invalid

```jsx
<a data-x="linkedin" href="https://linkedin.com">LinkedIn</a>
<a data-x="social-twitter" href="https://twitter.com">Twitter</a>
```

### Valid

```jsx
<a data-x="clickout-linkedin" href="https://linkedin.com">LinkedIn</a>
<a data-x="clickout-twitter" href="https://twitter.com">Twitter</a>
<a data-x="nav-home" href="/">Home</a>
```
