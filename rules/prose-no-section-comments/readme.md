# Prose: no section comments

Short section comments inside functions usually mean the function has hidden
steps that deserve names.

Extract those sections into functions instead.

## Correct

```js
function handleOrder(order) {
  validateOrder(order)
  const totals = calculateOrderTotals(order)
  return saveOrder(order, totals)
}
```

Comments that explain why something exists are still allowed.

```js
function handleOrder(order) {
  // Why: the payment provider rejects empty item arrays.
  return submitOrder(order)
}
```

## Incorrect

```js
function handleOrder(order) {
  // Validate
  validate(order)

  // Save
  return saveOrder(order)
}
```
