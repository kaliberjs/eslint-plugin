# data-x-onpage-action-format

On-page actions should use the format `action-target`.

## Rule Details

This rule enforces proper formatting for on-page actions. The format should clearly indicate both the action verb and the target element.

### Supported Action Verbs

| Category | Verbs |
|----------|-------|
| Navigation | `goto`, `go-to`, `scroll`, `reach`, `back` |
| Open/Close | `open`, `close`, `toggle` |
| Show/Hide | `show`, `hide`, `expand`, `collapse` |
| Media | `play`, `pause`, `stop` |
| Data | `fetch`, `save`, `copy`, `download`, `clear`, `reset`, `submit` |
| State | `change`, `accept` |

### Invalid

```jsx
<a data-x="scroll">Scroll Down</a>
<button data-x="open">Open</button>
<button data-x="toggle">Toggle</button>
```

### Valid

```jsx
<a data-x="scroll-applyform">Scroll to Form</a>
<button data-x="open-modal">Open Modal</button>
<button data-x="close-dialog">Close</button>
<button data-x="toggle-menu">Menu</button>
<a data-x="goto-next-slide">Next</a>
<button data-x="copy-to-clipboard">Copy</button>
<button data-x="save-favorites">Save</button>
```
