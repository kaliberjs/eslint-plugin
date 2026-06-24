# Prose: prefer named reducer

Reduce callbacks that go beyond simple scalar accumulation should be named
functions. When a reducer builds objects, uses conditionals, or spans multiple
statements, naming it makes the aggregation intent explicit.

## Correct

```js
items.reduce((sum, item) => sum + item.amount, 0)
items.reduce((total, item) => total + item.price, 0)
items.reduce(aggregateOrder, initialOrder)
items.reduce(toTotalPrice, 0)
```

## Incorrect

```js
items.reduce((result, item) => { result[item.id] = item; return result }, {})
items.reduce((acc, item) => item.active ? acc + 1 : acc, 0)
items.reduce((groups, item) => ({ ...groups, [item.type]: [...(groups[item.type] || []), item] }), {})
items.reduce((acc, item) => acc.concat(item.children), [])
```

## When Not To Use It

If your team is comfortable with inline reducers of any complexity, or if you
prefer to handle reduce readability through code review only.
