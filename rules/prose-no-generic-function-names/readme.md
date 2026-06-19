# Prose: no generic function names

Function names should describe the domain outcome, not the mechanics used to get
there. This rule targets names that are generic enough that a reader still has
to inspect the body.

## Correct

```js
function getActiveSubscriptions(subscriptions) {}
function extractOrderTotals(orders) {}
function normalizeUserInput(rawFormData) {}
function processDocument(document) {}
```

## Incorrect

```js
function filterAndMap(data) {}
function processData(data) {}
function handleStuff(input) {}
function transformInput(input) {}
```

## Options

```js
{
  genericNames: ['massageData'],
  genericVerbs: ['prepare'],
  genericNouns: ['payload']
}
```
