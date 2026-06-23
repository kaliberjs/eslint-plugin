# Prose: no magic condition

Conditions should speak in domain terms. Numeric literals such as `30` or `10`
and regular expressions usually encode a rule that deserves a name.

## Correct

```js
if (isAdult(person)) grantAccess()
if (exceededMaxRetries(retries)) throw new Error('Failed')
if (status === ACTIVE_STATUS) renderActiveState()
if (typeof value === 'string') renderString(value)
if (status === 'active') renderActiveState()
```

## Incorrect

```js
if (age >= 18) grantAccess()
if (retries > 3) throw new Error('Failed')
if (discountPercentage >= 10) applyDiscount()
```

## Options

```js
{
  allow: ['idle'],
  ignoreBoolean: true,
  ignoreNullish: true,
  ignoreTypeof: true,
  ignoreStringLiterals: true
}
```

`ignoreBoolean`, `ignoreNullish`, `ignoreTypeof`, and `ignoreStringLiterals`
all default to `true`. Set `ignoreStringLiterals` to `false` to also flag
string literals like `'admin'` or `'expired'` in conditions.

