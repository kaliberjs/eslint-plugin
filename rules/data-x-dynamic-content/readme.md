# data-x-dynamic-content

Body content from ATS/CRM systems should use sanitized `data-x` values with proper tracking.

## Rule Details

This rule provides guidance for handling dynamic content from external systems (like ATS or CRM) that can't be labeled by end-users. When using dynamic `data-x` values, ensure proper tracking by including `data-x-context` or `data-x-id` attributes.

### Invalid

```jsx
<button data-x={dynamicValue}>Toggle</button>
<a data-x={getQuestion()}>Question</a>
```

### Valid

```jsx
<button data-x={dynamicValue} data-x-context="faq">Toggle</button>
<a data-x="toggle-question" data-x-id={question.id}>Question</a>
<button data-x={getValue()} data-x-id={item.id}>Click</button>

// Static values are fine
<button data-x="toggle-question">Question</button>
```
