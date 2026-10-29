# Expanded spreads (@kaliber/jsx-a11y-*, @kaliber/react-*)

Kaliber writes same-name props as a static object spread, so the handlers stay together:

```jsx
<div {...{ onClick, onKeyDown }} />
```

`jsx-ast-utils` (used by `eslint-plugin-jsx-a11y` and `eslint-plugin-react`) reads that differently per helper. `getProp` and `getPropValue` look into an object-literal spread, but `hasProp` and `hasAnyProp` ignore every spread by default (`spreadStrict: true`). So `click-events-have-key-events` reports `onClick` as having no key listener, and `no-static-element-interactions` misses the element. The explicit form `<div onClick={onClick} onKeyDown={onKeyDown} />` is read correctly.

Each rule in this group is the stock rule wrapped by `machinery/expandStaticSpreads.js`. Before the stock rule sees an element, a static object spread is replaced by one synthetic `JSXAttribute` per property:

- A spread is expanded only when every property is a plain `key: value` or shorthand, with an identifier or string key, not computed and not a getter or setter. Any other spread stays as written, and the stock rule sees it as before.
- Synthetic attributes carry the spread's `range` and `loc`, so reports land on the source spread. Rules that report on the element still report on the element.
- The source AST is not changed. The wrapper copies the element and opening element, and the copies keep the original `parent`, so scope and ancestor lookups still work.
- Rules that listen to `JSXAttribute` (`aria-props`, `aria-proptypes`, `aria-role`, `role-has-required-aria-props`) also receive the synthetic attributes, and their `attribute.parent` is the expanded opening element.
- Spreads of anything else (`{...props}`, `{...getReferenceProps()}`) are not touched.

## Rules

| Rule | Stock rule |
|---|---|
| `@kaliber/jsx-a11y-alt-text` | `jsx-a11y/alt-text` |
| `@kaliber/jsx-a11y-anchor-has-content` | `jsx-a11y/anchor-has-content` |
| `@kaliber/jsx-a11y-anchor-is-valid` | `jsx-a11y/anchor-is-valid` |
| `@kaliber/jsx-a11y-aria-activedescendant-has-tabindex` | `jsx-a11y/aria-activedescendant-has-tabindex` |
| `@kaliber/jsx-a11y-aria-props` | `jsx-a11y/aria-props` |
| `@kaliber/jsx-a11y-aria-proptypes` | `jsx-a11y/aria-proptypes` |
| `@kaliber/jsx-a11y-aria-role` | `jsx-a11y/aria-role` |
| `@kaliber/jsx-a11y-aria-unsupported-elements` | `jsx-a11y/aria-unsupported-elements` |
| `@kaliber/jsx-a11y-click-events-have-key-events` | `jsx-a11y/click-events-have-key-events` |
| `@kaliber/jsx-a11y-heading-has-content` | `jsx-a11y/heading-has-content` |
| `@kaliber/jsx-a11y-html-has-lang` | `jsx-a11y/html-has-lang` |
| `@kaliber/jsx-a11y-iframe-has-title` | `jsx-a11y/iframe-has-title` |
| `@kaliber/jsx-a11y-img-redundant-alt` | `jsx-a11y/img-redundant-alt` |
| `@kaliber/jsx-a11y-no-access-key` | `jsx-a11y/no-access-key` |
| `@kaliber/jsx-a11y-no-redundant-roles` | `jsx-a11y/no-redundant-roles` |
| `@kaliber/jsx-a11y-no-static-element-interactions` | `jsx-a11y/no-static-element-interactions` |
| `@kaliber/jsx-a11y-role-has-required-aria-props` | `jsx-a11y/role-has-required-aria-props` |
| `@kaliber/jsx-a11y-role-supports-aria-props` | `jsx-a11y/role-supports-aria-props` |
| `@kaliber/react-button-has-type` | `react/button-has-type` |
| `@kaliber/react-jsx-no-duplicate-props` | `react/jsx-no-duplicate-props` |
| `@kaliber/react-no-danger-with-children` | `react/no-danger-with-children` |
| `@kaliber/react-void-dom-elements-no-children` | `react/void-dom-elements-no-children` |

The shared config enables these instead of the stock rules. `react/button-has-type` already reads object spreads through `getProp`. It is wrapped anyway, so the group behaves the same, and no adapted rule is left on the stock name.

## Not adapted

- `react/jsx-no-target-blank` has a fixer that splices text at an attribute's range. Expanded attributes would make it insert or replace text inside a spread, so it stays stock. Its spread blind spot remains.
- `jsx-a11y/no-distracting-elements` reads only the element name, so there is nothing to expand.
- Formatting rules (`react/jsx-indent-props`, `react/jsx-wrap-multilines`, `react/jsx-boolean-value`, `react/self-closing-comp`, the `@stylistic` JSX rules) work on tokens and fixers, not on attribute meaning.
- `react/jsx-no-duplicate-props` is adapted, so `<div {...{ onClick }} onClick={a} />` is reported as a duplicate. This is a real duplicate that the stock rule could not see.

## Known limits

- A spread with a computed key, a spread inside the object, or a method or getter stays unexpanded, so the stock behaviour applies to it (`<div {...{ onClick, ['onKeyDown']: k }} />` is still reported).
- Expansion happens only for JSX written in the file. Spreads of variables are never expanded.
