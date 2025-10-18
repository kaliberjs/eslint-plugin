# ESLint Migration Plan

This document outlines the plan for migrating our ESLint configuration to a newer version. The primary goal is to upgrade to ESLint v9 and switch to the new flat `eslint.config.js` file, while ensuring that we don't break any existing functionality and maintain backward compatibility.

## Migration Steps

1.  **Understand the New Configuration Format**: Familiarize yourself with the new flat `eslint.config.js` format. The main change is the move from a `.eslintrc` file to a JavaScript-based configuration file.

2.  **Identify Custom Rules**: We have a set of custom ESLint rules. For each rule, we need to ensure it's compatible with the new ESLint version and configuration format.

3.  **Update Dependencies**: We'll update all ESLint-related dependencies to their latest versions, ensuring they are compatible with ESLint v9.

4.  **Create `eslint.config.js`**: We will create the new `eslint.config.js` file and translate the existing `.eslintrc` configuration to the new flat format.

5.  **Test the New Configuration**: We will thoroughly test the new configuration to ensure that all rules are working as expected and that there are no regressions.

6.  **Update Documentation**: We will update our internal documentation to reflect the changes in the ESLint configuration.

7.  **Remove Old Configuration**: Once we are confident that the new configuration is working correctly, we will remove the old `.eslintrc` file.

## Custom Rules

This section provides a detailed overview of our custom ESLint rules.

### Component Properties (`@kaliber/component-properties`)

**Description**

This rule enforces two policies related to component properties:

*   **Destructure Props**: Requires destructuring of `props` in component definitions to improve type inference and catch incorrect property usage.
*   **Variable Passing**: Promotes a consistent code style by requiring the use of object spread (`{...{ prop }}`) when passing a variable with the same name as the prop.

**Examples**

#### Destructure Props

**Wrong:**

```jsx
function MyComponent(props) {
  return <Abc test={props.value} />;
}
```

**Correct:**

```jsx
function MyComponent({ value }) {
  return <Abc test={value} />;
}
```

#### Variable Passing

**Wrong:**

```jsx
function MyComponent({ test }) {
  return <Abc test={test} />;
}
```

**Correct:**

```jsx
function MyComponent({ test }) {
  return <Abc {...{ test }} />;
}
```

**Rule Names**

*   **Old Version (`.eslintrc`)**: `@kaliber/component-properties`
*   **New Version (`eslint.config.js`)**: `@kaliber/component-properties`

---

### Detect Missing Key Prop (`@kaliber/jsx-key`)

**Description**

This rule is an adaptation of the standard `react/jsx-key` rule, but it allows for keyless JSX in array literals. This is useful for DSLs where arrays of JSX elements are destructured rather than iterated over.

**Examples**

**Wrong:**

```jsx
[<div />, <div />].map(x => x);
```

**Correct (and allowed by this rule):**

```jsx
myDslFunction(
  ['something', <Abc />],
  ['anything', <Def />],
);
```

**Rule Names**

*   **Old Version (`.eslintrc`)**: `@kaliber/jsx-key`
*   **New Version (`eslint.config.js`)**: `@kaliber/jsx-key`

---

### Layout Class Name (`@kaliber/layout-class-name`)

**Description**

This rule prevents passing `className` to custom components, treating them as black boxes. Instead, it introduces the `layoutClassName` prop for positioning, which must be suffixed with `Layout`. `Base` components are an exception and can receive a `className`, but they cannot be exported.

**Examples**

**Wrong:**

```jsx
function MyComponent() {
  return (
    <div className={styles.component}>
      <BlackBox className={styles.blackBox} />
    </div>
  );
}
```

**Correct:**

```jsx
function MyComponent() {
  return (
    <div className={styles.component}>
      <BlackBox layoutClassName={styles.blackBoxLayout} />
    </div>
  );
}
```

**Rule Names**

*   **Old Version (`.eslintrc`)**: `@kaliber/layout-class-name`
*   **New Version (`eslint.config.js`)**: `@kaliber/layout-class-name`

---

### Naming Policy (`@kaliber/naming-policy`)

**Description**

This rule enforces a consistent naming policy for components, CSS files, variables, and refs to improve readability and allow for convention-based tooling.

**Examples**

#### Component Name

**Wrong:**
`Test.js`:
```js
export function Something() {}
```

**Correct:**
`Test.js`:
```js
export function Test() {}
```

#### CSS file and variable name

**Wrong:**
`Test.js`:
```js
import styles from './Something.css'
```

**Correct:**
`Test.js`:
```js
import styles from './Test.css'
```

#### CSS variable properties

**Wrong:**
```js
styles._abc
```

**Correct:**
```js
styles.abc
```

#### Root element class name

**Wrong:**
`Test.js`:
```jsx
function Test() {
  return <div className={styles.test} />
}
```

**Correct:**
`Test.js`:
```jsx
function Test() {
  return <div className={styles.component} />
}
```

#### Refs

**Wrong:**
```jsx
function Test() {
  const container = React.useRef()
}
```

**Correct:**
```jsx
function Test() {
  const containerRef = React.useRef()
}
```

**Rule Names**

*   **Old Version (`.eslintrc`)**: `@kaliber/naming-policy`
*   **New Version (`eslint.config.js`)**: `@kaliber/naming-policy`

---

### No Default Export (`@kaliber/no-default-export`)

**Description**

This rule disallows the use of `export default`, with a few exceptions (`App` components and templates). This is to avoid the ambiguity and potential for refactoring issues that can arise from default exports.

**Examples**

**Wrong:**

```jsx
export default function MyComponent() {}
```

**Correct:**

```jsx
export function MyComponent() {}
```

**Rule Names**

*   **Old Version (`.eslintrc`)**: `@kaliber/no-default-export`
*   **New Version (`eslint.config.js`)**: `@kaliber/no-default-export`

---

### No Relative Parent Import (`@kaliber/no-relative-parent-import`)

**Description**

This rule prohibits importing modules using relative parent paths (`../`). Instead, it encourages the use of root-slash imports (`/`) to prevent broken imports when files are moved.

**Examples**

**Wrong:**

```jsx
import { Test } from '../machinery/Test';
```

**Correct:**

```jsx
import { Test } from '/machinery/Test';
```

**Rule Names**

*   **Old Version (`.eslintrc`)**: `@kaliber/no-relative-parent-import`
*   **New Version (`eslint.config.js`)**: `@kaliber/no-relative-parent-import`

## Test Plan

The testing strategy for this migration will focus on ensuring that the new ESLint configuration is functionally equivalent to the old one. We will use `node:test` as our test framework.

The following steps will be taken:

1.  **Create Test Cases**: For each custom rule, we will create a set of test cases that cover both correct and incorrect code examples.
2.  **Run Tests with Old Configuration**: We will run the tests with the old `.eslintrc` configuration to establish a baseline.
3.  **Run Tests with New Configuration**: We will then run the same tests with the new `eslint.config.js` configuration.
4.  **Compare Results**: The results from both test runs will be compared to ensure that the new configuration produces the same errors and warnings as the old one.
5.  **Lint the Entire Codebase**: After verifying the custom rules, we will run ESLint on the entire codebase with the new configuration to catch any unexpected issues.

## Development Considerations

*   **Minimize External Libraries**: To keep the project lightweight and maintainable, we should avoid introducing new external libraries unless absolutely necessary.
*   **Use `node:test`**: All new tests should be written using the built-in `node:test` module. This helps to reduce our reliance on third-party testing frameworks.
*   **Backward Compatibility**: All changes must be backward compatible. The new ESLint configuration should not introduce any breaking changes for existing code.
*   **Junior Developer Friendly**: This document and the migration process should be clear and easy to follow for developers of all experience levels.
