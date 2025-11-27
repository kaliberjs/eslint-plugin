# data-x-navigation-context

When navigating to different pages/screens, use a good reference as `data-x` and include `data-x-context` for the component name.

## Rule Details

This rule reminds developers that when navigation links appear in multiple components (e.g., main nav, subnav, footer), they should include a `data-x-context` attribute to distinguish them.

### Examples

#### Navigation with Context

```jsx
<a data-x="job-overview" data-x-context="mainnav">Jobs</a>
<a data-x="contact" data-x-context="footer">Contact</a>
```

#### When Context is Not Needed

```jsx
<button data-x="submit-form">Submit</button>
<a data-x="clickout-linkedin">LinkedIn</a>
```
