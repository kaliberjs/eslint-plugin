# no-nested-component

Prevent specific React components from being nested inside each other in the same file's JSX tree.

## Rule Details

This rule catches cases where components that shouldn't be nested end up inside each other — even with intermediate native elements between them.

### ❌ Invalid

```jsx
// Container inside Container
<ContainerLg>
  <ContainerSm>
    <p>content</p>
  </ContainerSm>
</ContainerLg>

// Still invalid — intermediate elements don't help
<ContainerXxl>
  <div>
    <ContainerLg>
      <div />
    </ContainerLg>
  </div>
</ContainerXxl>

// Heading inside Heading
<HeadingXl h={1} title="A">
  <HeadingMd h={2} title="B" />
</HeadingXl>
```

### ✅ Valid

```jsx
// Different component types can nest freely
<ContainerLg>
  <HeadingXl h={1} title="Hello" />
  <Button />
</ContainerLg>

// Unlisted components are not restricted
<Foo><Bar /></Foo>
```

## Default Deny List

| Parent | Child | Rationale |
|--------|-------|-----------|
| `Container*` | `Container*` | Containers add max-width + padding — nesting creates unintended narrowing |
| `Heading*` | `Heading*` | Headings define document hierarchy — nesting breaks semantics |

Patterns ending with `*` match any component name that starts with the prefix.

## Options

Override the default deny list:

```js
'@kaliber/no-nested-component': ['error', {
  deny: [
    { parent: 'Container*', child: 'Container*' },
    { parent: 'Modal', child: 'Modal' },
  ]
}]
```
