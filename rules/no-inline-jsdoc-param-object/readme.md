# no-inline-jsdoc-param-object

Document a destructured parameter as `@param {object} name` plus a dotted `@param` per property,
rather than as one inline object type.

## Rule details

Both forms describe the same type, but only the dotted one is cross-checked against the function
signature. An inline object type is a single type expression, so a property that is documented and
then never destructured is reported by neither ESLint nor `tsc` — the annotation quietly promises a
prop the component ignores.

```js
// the linter reports `props.layoutClassName` here
/**
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.layoutClassName]
 */
function Checkbox({ label }) { /* … */ }

// and cannot report it here — there is nothing to compare against
/** @param {{ label: string, layoutClassName?: string }} props */
function Checkbox({ label }) { /* … */ }
```

The rule is autofixable, including expanding a single-line block into a multi-line one.

### Exceptions

The inline form is left alone where dotted cannot express the same thing:

- **a nested path** below what the signature destructures, e.g. `@param {{ … }} options.auth`
- **an array of objects**, e.g. `@param {{ at: string }[]} breakpoints`
- **inside an `@overload` block**, and in the implementation signature of an overloaded function —
  dotted params break overload resolution (`TS2769`)
- **a type that has no dotted equivalent at all**, such as an index signature or an intersection
- **any non-parameter position**: `@typedef`, `@returns`, a cast

### ✅ Valid

```js
/**
 * @param {object} params
 * @param {string} params.href
 * @param {boolean} [params.targetSelf]
 */
function determineLinkProps({ href, targetSelf = false }) { /* … */ }

/** @param {{ username: string, password: string }} options.auth */
/** @param {{ at: ContainerSize, fraction: number }[]} breakpoints */
/** @param {{ [key: string]: string }} lookup */
/** @typedef {{ a: string }} Thing */
```

### ❌ Invalid

```js
/** @param {{ href: string, targetSelf?: boolean }} params */
function determineLinkProps({ href, targetSelf = false }) { /* … */ }
```

Fixed to:

```js
/**
 * @param {object} params
 * @param {string} params.href
 * @param {boolean} [params.targetSelf]
 */
function determineLinkProps({ href, targetSelf = false }) { /* … */ }
```
