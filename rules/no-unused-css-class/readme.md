# no-unused-css-class

A class a CSS Module defines should be read by the component that imports it.

The companion of [`no-undef-css-class`](../no-undef-css-class/readme.md), reading the same
stylesheet from the other side: a class nothing applies is dead weight that still has to be
understood by the next person to open the file.

## Rule details

Reported once per stylesheet, on the import, listing the classes nothing in the file reads.

### ✅ Valid

```js
import styles from './Card.css'          // defines .component and .titleLayout

function Card({ title }) {
  return (
    <div className={styles.component}>
      <Title layoutClassName={styles.titleLayout} {...{ title }} />
    </div>
  )
}
```

### ❌ Invalid

```js
import styles from './Card.css'          // defines .component, .titleLayout and .badge

function Card({ title }) {
  return <div className={styles.component}><Title layoutClassName={styles.titleLayout} /></div>
  //     nothing reads '.badge'
}
```

## When it abstains, and why that matters

This rule is about **absence**, so it reports only where absence is established. One reference it
cannot read means any class could be the one that is used, and reporting the rest would be telling
somebody to delete a class their code applies. In each of these it reports nothing at all:

```js
styles[name]        // which class this reads is not written down
{ ...styles }       // every class may leave this file
Object.keys(styles) // same
```

A stylesheet that could not be read is also silent here; `no-undef-css-class` reports that once,
and saying it twice adds nothing.

## Options

```json
["warn", { "ignore": ["**/features/content/Content.css"] }]
```

`ignore` takes glob patterns matched against the resolved stylesheet path. It exists for the one
real exception: **a stylesheet several components share**. Whether a class is unused is then a
question about the project, and no single file can answer it — of 378 stylesheets across three
Kaliber projects, exactly one was imported by more than one module.
