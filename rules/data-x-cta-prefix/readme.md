# data-x-cta-prefix

Call-to-action links (not packaged as `<button>` elements) should use the "cta-" prefix.

## Rule Details

This rule enforces that `<a>` elements acting as call-to-action links use the "cta-" prefix in their `data-x` attribute. Common CTA actions include: apply, submit, register, signup, download, contact, etc.

Note: This rule only applies to `<a>` elements. Actual `<button>` elements don't need the "cta-" prefix.

### Invalid

```jsx
<a data-x="apply">Apply Now</a>
<a data-x="download-brochure">Download</a>
<a data-x="contact-us">Contact</a>
```

### Valid

```jsx
<a data-x="cta-apply">Apply Now</a>
<a data-x="cta-download">Download</a>
<button data-x="submit">Submit</button>
<a data-x="nav-home">Home</a>
```
