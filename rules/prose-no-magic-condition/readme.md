# Prose: no magic condition

Conditions should speak in domain terms. Literal values such as `30`, `'admin'`,
or `/pattern/` usually encode a rule that deserves a name.

## Correct

```js
if (isAdult(person)) grantAccess()
if (exceededMaxRetries(retries)) throw new Error('Failed')
if (status === ACTIVE_STATUS) renderActiveState()
if (typeof value === 'string') renderString(value)
```

## Incorrect

```js
if (age >= 18) grantAccess()
if (retries > 3) throw new Error('Failed')
if (status === 'active') renderActiveState()
```

## Options

```js
{
  allow: ['idle'],
  ignoreBoolean: true,
  ignoreNullish: true,
  ignoreTypeof: true
}
```

`ignoreBoolean`, `ignoreNullish`, and `ignoreTypeof` default to `true`.
