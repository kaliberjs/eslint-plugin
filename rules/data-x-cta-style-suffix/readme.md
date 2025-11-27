# data-x-cta-style-suffix

Multiple CTA buttons with different visual styles should include a style suffix in their `data-x` attribute.

## Rule Details

This rule enforces that when the same CTA action appears multiple times with different styling (e.g., primary, secondary, outline), each variant should have a style suffix to distinguish them in analytics.

Common suffixes: `-primary`, `-secondary`, `-tertiary`, `-outline`, `-ghost`

### Invalid

```jsx
<button data-x="apply" className="btn-primary">Apply Now</button>
<button data-x="apply" className="btn-secondary">Learn More</button>
```

### Valid

```jsx
<button data-x="apply-primary" className="btn-primary">Apply Now</button>
<button data-x="apply-secondary" className="btn-secondary">Learn More</button>

// Single button doesn't need suffix
<button data-x="submit">Submit</button>
```
