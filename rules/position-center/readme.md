# Position center

Discourage use of `place-content: center` because of its subtle and layout-breaking behavior.

It only aligns tracks when there is extra space and often does nothing in single-line flex or simple grid layouts. In most cases you probably want `place-items: center` (for centering items) or `align-items` / `justify-content` instead.

## Examples

Examples of *correct* code for this rule:

```js
const styles = { placeContent: 'flex-start' }
```
```js
const styles = { 'place-content': 'space-between' }
```
```js
const styles = { placeItems: 'center' }
```
```js
const styles = { alignItems: 'center', justifyContent: 'center' }
```

Examples of *incorrect* code for this rule:

```js
const styles = { placeContent: 'center' }
```
```js
const styles = { 'place-content': 'center' }
```
```js
const styles = { placeContent: `center` }
```
