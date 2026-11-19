# no-undef-css-class

A class read from a CSS Module must be one the imported stylesheet defines.

`styles.headingLayout` for a class that does not exist is `undefined`, and `className={undefined}`
renders nothing and throws nothing. The layout is simply not applied, in a component that looks
correct in review and in the editor.

## Rule details

The rule reads the stylesheet the file imports — `import styles from './Component.css'` — parses
it with postcss, and checks every `styles.x` against the classes that stylesheet defines.

Only relative specifiers are read, because those are the ones resolvable without knowing the
project's build aliases.

### ✅ Valid

```js
import styles from './ApplyBanner.css'

function ApplyBanner({ layoutClassName }) {
  return (
    <div className={cx(styles.component, layoutClassName)}>
      <Icon layoutClassName={styles.iconLayout} />
    </div>
  )
}
```

```css
.component {
  display: grid;

  & > .iconLayout { grid-area: icon; }
}
```

A class declared inside a nested rule is a class the module exports, and this rule reads it.
That is not a detail: it is why this rule exists rather than
[`eslint-plugin-css-modules`](https://www.npmjs.com/package/eslint-plugin-css-modules), whose
parser does not read nesting and reports **nothing at all** for a stylesheet that uses it —
including the undefined classes it would have caught in a flat one.

### ❌ Invalid

```js
import styles from './ApplyBanner.css'   // defines .component and .iconLayout

function ApplyBanner() {
  return <HeadingSm layoutClassName={styles.headingLayout} />
  //                                 ^ '.headingLayout' is not in ApplyBanner.css
}
```

## What it does not decide

- **`styles[name]`** — which class it reads is not written down, so guessing would put a wrong
  verdict on working code.
- **A stylesheet it could not read** is reported on the import, not passed over. A check that is
  silent about a file it failed to parse looks exactly like a check that found nothing.
- **`:global(.legacy)`** is deliberately not a definition: css-loader leaves a global class where
  it is and exports nothing for it, so `styles.legacy` really is `undefined`.

## Options

None.
