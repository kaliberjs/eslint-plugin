# data-x-onpage-action-format

On-page actions (scrolls, modals, etc.) should use the format `action-target` or `cta-action-target`.

## Rule Details

This rule enforces proper formatting for on-page actions like scrolling, opening modals, expanding sections, etc. The format should clearly indicate both the action and the target.

### Invalid

```jsx
<a data-x="scroll">Scroll Down</a>
<button data-x="open">Open</button>
```

### Valid

```jsx
<a data-x="scroll-applyform">Scroll to Form</a>
<a data-x="cta-scroll-contact">Contact Us</a>
<button data-x="open-modal">Open</button>
<button data-x="close-dialog">Close</button>
<a data-x="expand-section">Show More</a>
```
