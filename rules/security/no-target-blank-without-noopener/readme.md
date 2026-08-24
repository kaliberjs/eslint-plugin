# security-no-target-blank-without-noopener

Sever the opener relationship on new windows.

## Why it matters

A page opened with a window.opener handle can navigate or script this application after the user returns to it. Anchors with _blank are low severity (modern browsers imply noopener); window.open without noopener in its features still grants the handle and is the part that matters.

## Incorrect

```js
window.open(url)
```

## Correct

```js
window.open(url, name, 'noopener')
```

## Limitations

Stated honestly: Dynamic rel/features values stay quiet rather than guessed at; other .open calls (files, sockets) are receiver-gated to window.

## Prior art

SonarJS S5148, react/jsx-no-target-blank

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
