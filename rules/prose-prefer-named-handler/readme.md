# Prose: prefer named handler

Inline event handlers with multiple statements bury implementation details
inside JSX, hiding *what* the handler does behind *how* it does it. Extracting
them into named functions lets the JSX express intent at a glance.

## Correct

```jsx
<Button onClick={handleClick} />
<Button onClick={() => setOpen(true)} />
<Input onChange={(e) => setName(e.target.value)} />
<Button onClick={() => { handleClick() }} />
```

## Incorrect

```jsx
<Button onClick={() => { setOpen(true); track("click") }} />
<Form onSubmit={(e) => { e.preventDefault(); submit(e.target) }} />
<Button onClick={function() { doA(); doB() }} />
```

## Options

### `maxStatements`

Type: `integer` · Default: `1`

The maximum number of statements allowed in an inline handler's block body
before the rule reports. Set to `0` to disallow any block-body handler, or
increase to allow slightly larger inline handlers.

```json
{ "@kaliber/prose-prefer-named-handler": ["warn", { "maxStatements": 2 }] }
```

## When Not To Use It

If your team prefers keeping small multi-statement handlers inline, or if you
rely on code review alone to manage handler readability.
