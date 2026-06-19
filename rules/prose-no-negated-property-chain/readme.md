# Prose: no negated property chain

Negation plus property access asks the reader to decode a data shape and invert it
at the same time.

Extract the intent into a predicate.

## Correct

```js
if (isMissingDocumentType(response)) return
if (hasNoItems(items)) return
if (!isReady(user)) return
```

## Incorrect

```js
if (!response.data._type) return
if (!items.length) return
if (!user.active) return
```

## Options

```js
{
  minDepth: 2
}
```

`minDepth` defaults to `1`, so any negated property access is reported. Set it to
`2` if a project wants to allow `!user.active` but still reject
`!response.data._type`.
