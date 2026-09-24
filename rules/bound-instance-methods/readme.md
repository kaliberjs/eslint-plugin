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

  // Accessors are exempt
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

Arrow functions and computed field names inherit the surrounding `this`. A computed field name does not use the field initializer's instance.

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

A generator cannot be written as an arrow function. Use a function expression bound to the instance when initializing the field:

```js
// ❌
class Stream {
  *values() {}
  values = function* () {}
}
```

```js
// ✅
class Stream {
  #value = 42

  values = (function* () { yield this.#value }).bind(this)
}

const { values } = new Stream()
values().next()                     // { value: 42, done: false }
```

For constructor assignments, use `this.values = (function* () {}).bind(this)`. A separately declared generator can also be assigned with `this.values = values.bind(this)`.

Binding the generator in the constructor works too, and is recognised:

```js
class Stream {
  constructor() {
    this.values = this.values.bind(this)
  }

  *values() {}
}
```

The binding has to be a statement in the constructor body, assigning to the same name with `this` as the only argument. A regular method bound the same way still warns — it has an arrow form, which is the house style.

## Limitations

Assigning an identifier is only flagged when it has a single declaration in the same file and is not reassigned. Imported values, parameters, and reassigned variables are treated as unknown:

```js
import { handler as importedHandler } from './handler'

function handler() {}

class Menu {
  constructor(callback) {
    this.handler = handler          // flagged
    this.imported = importedHandler // not flagged — the declaration is elsewhere
    this.callback = callback        // not flagged — a parameter can be anything
  }
}
```

The rule does not perform type or control-flow analysis to recover those values.
