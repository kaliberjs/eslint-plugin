# data-x-unique-id

Multiple elements with the same `data-x` value in lists should include a unique `data-x-id` attribute.

## Rule Details

This rule enforces that when elements with the same `data-x` value appear in lists (e.g., `.map()` results), they should include a `data-x-id` attribute with a unique identifier to distinguish between them.

### Invalid

```jsx
jobs.map(job => (
  <a key={job.id} data-x="job-detail">View Job</a>
))
```

### Valid

```jsx
jobs.map(job => (
  <a key={job.id} data-x="job-detail" data-x-id={job.id}>View Job</a>
))

// Single instance doesn't need data-x-id
<a data-x="nav-home">Home</a>
```
