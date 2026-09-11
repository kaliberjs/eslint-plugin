# bound-instance-methods

Requires functions that live on an instance to bind `this`, so they keep working once they are detached from the object.

## Rule details

A regular function takes its `this` from the call site, not from where it was written. That is fine while the method stays attached, and breaks the moment it does not:

```js
class Menu {
  toggle() { this.open = !this.open }
}

const menu = new Menu()
menu.toggle()                       // works — `this` is `menu`

const { toggle } = menu
toggle()                            // TypeError — `this` is undefined

element.addEventListener('click', menu.toggle)   // same problem, silently
```

An arrow function has no `this` of its own, so it closes over the instance and survives detaching.

### ✅ Valid

```js
class Menu {
  open = false

  toggle = () => { this.open = !this.open }

  constructor() {
    this.close = () => { this.open = false }
  }

  // Statics have no instance `this` to lose
  static create() {}
  static make = function () {}

  // Not methods
  constructor() {}
  get isOpen() { return this.open }
}
```

Assigning a value that is not a function is untouched — `this.name = name` stays as it is.

`this` is only the instance inside a non-static method body or a field initializer. Everywhere else it means something else, and the rule leaves it alone:

```js
class Menu {
  constructor() {
    function helper() {
      this.toggle = function () {}    // `this` is not the menu
    }

    const o = {
      helper() { this.toggle = function () {} }   // `this` is `o`
    }
  }

  static create() {
    this.toggle = function () {}      // `this` is the class
  }

  static {
    this.toggle = function () {}      // `this` is the class
  }
}
```

### ❌ Invalid

```js
class Menu {
  toggle() {}                       // Use an arrow function
  toggle = function () {}           // Use an arrow function

  constructor() {
    this.toggle = function () {}    // Use an arrow function
    this.toggle = toggle            // Assigning a function does not bind `this`
  }
}

function toggle() {}
```

## Generators

A generator cannot be written as an arrow function, so it gets its own message pointing at the only remedy — binding it in the constructor:

```js
// ❌
class Stream {
  *values() {}
  values = function* () {}
}

// ✅
class Stream {
  constructor() {
    this.values = values.bind(this)
  }
}

function* values() {}
```

## Limitations

Assigning an identifier is only flagged when the declaration is visible in the same file:

```js
function handler() {}
this.handler = handler              // flagged

import { handler } from './handler'
this.handler = handler              // not flagged — the declaration is elsewhere

class Menu {
  constructor(handler) {
    this.handler = handler          // not flagged — a parameter can be anything
  }
}
```

Closing those would need type information, not scope analysis.
