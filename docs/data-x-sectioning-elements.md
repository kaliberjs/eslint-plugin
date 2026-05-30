# data-x-sectioning-elements

Sectioning elements must have a `data-x` attribute.

## Rule Details

This rule enforces that semantic sectioning elements (`form`, `section`, `header`, `footer`, `nav`, `main`, `aside`) include a `data-x` attribute for tracking purposes.

### Invalid

```jsx
<section>Content</section>
<header>Header</header>
```

### Valid

```jsx
<section data-x="hero">Content</section>
<header data-x="main-header">Header</header>
```
