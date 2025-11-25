# data-x-toggle-prefix

Toggle/accordion/menu components should use the "toggle-" prefix in their `data-x` attribute.

## Rule Details

This rule enforces that interactive elements that toggle visibility or state (such as accordions, menus, dropdowns, FAQs) use the "toggle-" prefix in their `data-x` attribute.

Elements with `aria-expanded` attribute are also considered toggles and should use this prefix.

### Invalid

```jsx
<button data-x="menu">Menu</button>
<button data-x="accordion-item">Accordion</button>
<button data-x="faq" aria-expanded="false">FAQ</button>
<a data-x="question">Question</a>
```

### Valid

```jsx
<button data-x="toggle-menu">Menu</button>
<button data-x="toggle-accordion">Accordion</button>
<button data-x="toggle-faq">FAQ</button>
<a data-x="toggle-question">Question</a>
```
