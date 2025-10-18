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

## Built-in ESLint Rules

This section provides a list of all the built-in ESLint rules that are being used in the `.eslintrc` file, along with a brief description of each rule.

*   **brace-style**: Enforces consistent brace style for blocks.
*   **indent**: Enforces consistent indentation.
*   **accessor-pairs**: Enforces getter/setter pairs in objects.
*   **array-callback-return**: Enforces `return` statements in callbacks of array methods.
*   **arrow-spacing**: Enforces consistent spacing before and after the arrow in arrow functions.
*   **block-spacing**: Enforces consistent spacing inside single-line blocks.
*   **comma-dangle**: Requires or disallows trailing commas.
*   **comma-spacing**: Enforces consistent spacing before and after commas.
*   **comma-style**: Enforces comma style.
*   **default-case**: Requires `default` cases in `switch` statements.
*   **dot-location**: Enforces consistent newlines before and after dots.
*   **eol-last**: Requires or disallows newline at the end of files.
*   **eqeqeq**: Requires the use of `===` and `!==`.
*   **key-spacing**: Enforces consistent spacing between keys and values in object literal properties.
*   **keyword-spacing**: Enforces consistent spacing before and after keywords.
*   **new-parens**: Requires parentheses when invoking a constructor with no arguments.
*   **no-array-constructor**: Disallows `Array` constructors.
*   **no-caller**: Disallows the use of `arguments.caller` or `arguments.callee`.
*   **no-class-assign**: Disallows reassigning class members.
*   **no-compare-neg-zero**: Disallows comparing against -0.
*   **no-cond-assign**: Disallows assignment operators in conditional expressions.
*   **no-const-assign**: Disallows reassigning `const` variables.
*   **no-constant-condition**: Disallows constant expressions in conditions.
*   **no-control-regex**: Disallows control characters in regular expressions.
*   **no-debugger**: Disallows the use of `debugger`.
*   **no-delete-var**: Disallows deleting variables.
*   **no-dupe-args**: Disallows duplicate arguments in `function` definitions.
*   **no-dupe-class-members**: Disallows duplicate class members.
*   **no-dupe-keys**: Disallows duplicate keys in object literals.
*   **no-duplicate-case**: Disallows duplicate case labels.
*   **no-empty-character-class**: Disallows empty character classes in regular expressions.
*   **no-empty-pattern**: Disallows empty destructuring patterns.
*   **no-eval**: Disallows the use of `eval()`.
*   **no-ex-assign**: Disallows reassigning exceptions in `catch` clauses.
*   **no-extend-native**: Disallows extending native types.
*   **no-extra-bind**: Disallows unnecessary calls to `.bind()`.
*   **no-extra-boolean-cast**: Disallows unnecessary boolean casts.
*   **no-extra-label**: Disallows unnecessary labels.
*   **no-extra-parens**: Disallows unnecessary parentheses.
*   **no-fallthrough**: Disallows fallthrough of `case` statements.
*   **no-floating-decimal**: Disallows leading or trailing decimal points in numeric literals.
*   **no-func-assign**: Disallows reassigning `function` declarations.
*   **no-global-assign**: Disallows assignments to native objects or read-only global variables.
*   **no-implied-eval**: Disallows the use of `eval()`-like methods.
*   **no-invalid-regexp**: Disallows invalid regular expression strings in `RegExp` constructors.
*   **no-irregular-whitespace**: Disallows irregular whitespace.
*   **no-iterator**: Disallows the use of the `__iterator__` property.
*   **no-label-var**: Disallows labels that share a name with a variable.
*   **no-labels**: Disallows labeled statements.
*   **no-lone-blocks**: Disallows unnecessary nested blocks.
*   **no-loop-func**: Disallows function declarations and expressions inside loop statements.
*   **no-mixed-spaces-and-tabs**: Disallows mixed spaces and tabs for indentation.
*   **no-path-concat**: Disallows string concatenation with `__dirname` and `__filename`.
*   **no-proto**: Disallows the use of the `__proto__` property.
*   **no-return-assign**: Disallows assignment operators in `return` statements.
*   **no-return-await**: Disallows unnecessary `return await`.
*   **no-trailing-spaces**: Disallows trailing whitespace at the end of lines.
*   **no-unneeded-ternary**: Disallows ternary operators when simpler alternatives exist.
*   **no-unsafe-negation**: Disallows negating the left operand of relational operators.
*   **no-useless-return**: Disallows redundant `return` statements.
*   **object-curly-spacing**: Enforces consistent spacing inside braces of object literals.
*   **object-shorthand**: Requires or disallows method and property shorthand syntax for object literals.
*   **quotes**: Enforces the consistent use of either backticks, double, or single quotes.
*   **semi**: Requires or disallows semicolons instead of ASI.
*   **semi-spacing**: Enforces consistent spacing before and after semicolons.
*   **space-before-blocks**: Enforces consistent spacing before blocks.
*   **space-before-function-paren**: Enforces consistent spacing before `function` definition opening parenthesis.
*   **space-infix-ops**: Requires spacing around operators.
*   **space-unary-ops**: Enforces consistent spacing before or after unary operators.
*   **template-tag-spacing**: Requires or disallows spacing between template tags and their literals.
*   **no-mixed-operators**: Disallows mixing of different operators without parentheses.
*   **no-multi-str**: Disallows multiline strings.
*   **no-native-reassign**: Disallows reassigning native objects.
*   **no-negated-in-lhs**: Disallows negating the left operand in `in` expressions.
*   **no-new-func**: Disallows `new` operators with the `Function` object.
*   **no-new-object**: Disallows `Object` constructors.
*   **no-new-symbol**: Disallows `new` operators with the `Symbol` object.
*   **no-new-wrappers**: Disallows `new` operators with the `String`, `Number`, and `Boolean` objects.
*   **no-obj-calls**: Disallows calling global object properties as functions.
*   **no-octal**: Disallows octal literals.
*   **no-octal-escape**: Disallows octal escape sequences in string literals.
*   **no-redeclare**: Disallows variable redeclaration.
*   **no-regex-spaces**: Disallows multiple spaces in regular expression literals.
*   **no-restricted-globals**: Disallows specified global variables.
*   **no-restricted-properties**: Disallows certain properties on certain objects.
*   **no-restricted-syntax**: Disallows specified syntax.
*   **no-script-url**: Disallows `javascript:` urls.
*   **no-self-assign**: Disallows assignments where both sides are exactly the same.
*   **no-self-compare**: Disallows comparing a variable against itself.
*   **no-shadow-restricted-names**: Disallows identifiers from shadowing restricted names.
*   **no-sparse-arrays**: Disallows sparse arrays.
*   **no-template-curly-in-string**: Disallows template literals in strings.
*   **no-this-before-super**: Disallows `this`/`super` before calling `super()` in constructors.
*   **no-throw-literal**: Disallows throwing literals as exceptions.
*   **no-undef**: Disallows the use of undeclared variables unless mentioned in `/*global */` comments.
*   **no-unexpected-multiline**: Disallows confusing multiline expressions.
*   **no-unreachable**: Disallows unreachable code after `return`, `throw`, `continue`, and `break` statements.
*   **no-unused-expressions**: Disallows unused expressions.
*   **no-unused-labels**: Disallows unused labels.
*   **no-unused-vars**: Disallows unused variables.
*   **no-use-before-define**: Disallows the use of variables before they are defined.
*   **no-useless-computed-key**: Disallows unnecessary computed property keys in objects.
*   **no-useless-concat**: Disallows unnecessary concatenation of literals or template literals.
*   **no-useless-constructor**: Disallows unnecessary constructors.
*   **no-useless-escape**: Disallows unnecessary escape characters.
*   **no-whitespace-before-property**: Disallows whitespace before properties.
*   **no-with**: Disallows `with` statements.
*   **radix**: Enforces the consistent use of the radix argument when using `parseInt()`.
*   **require-yield**: Requires generator functions to contain `yield`.
*   **rest-spread-spacing**: Enforces spacing between rest and spread operators and their expressions.
*   **strict**: Requires or disallows strict mode directives.
*   **unicode-bom**: Requires or disallows the Unicode BOM.
*   **use-isnan**: Requires calling `isNaN()` when checking for `NaN`.
*   **valid-typeof**: Enforces comparing `typeof` expressions against valid strings.
*   **import/first**: Enforces that all imports are at the top of the file.
*   **import/no-amd**: Disallows AMD `require` and `define`.
*   **import/no-webpack-loader-syntax**: Disallows webpack loader syntax in imports.
*   **import/no-default-export**: Disallows default exports.
*   **import/no-duplicates**: Disallows duplicate imports.
*   **import/export**: Disallows invalid exports, e.g., multiple default exports.
*   **import/default**: Enforces a default export is present, if so desired.
*   **import/no-unresolved**: Ensures imports can be resolved to a file on the local filesystem.
*   **import/named**: Enforces named imports correspond to named exports in the remote file.
*   **react/jsx-boolean-value**: Enforces boolean attributes notation in JSX.
*   **react/jsx-curly-spacing**: Enforces consistent spacing inside JSX curly braces.
*   **react/jsx-equals-spacing**: Enforces consistent spacing around equal signs in JSX attributes.
*   **react/jsx-indent**: Enforces consistent JSX indentation.
*   **react/jsx-indent-props**: Enforces consistent indentation for props in JSX.
*   **react/jsx-key**: Disallows missing `key` props in iterators or array literals.
*   **react/jsx-no-comment-textnodes**: Prevents comments from being inserted as text nodes.
*   **react/jsx-no-duplicate-props**: Prevents duplicate props in JSX.
*   **react/jsx-no-target-blank**: Enforces `rel="noopener noreferrer"` for `target="_blank"` links.
*   **react/jsx-no-undef**: Disallows undeclared variables in JSX.
*   **react/jsx-pascal-case**: Enforces PascalCase for user-defined JSX components.
*   **react/jsx-tag-spacing**: Enforces consistent spacing within JSX tags.
*   **react/jsx-uses-react**: Prevents React to be incorrectly marked as unused.
*   **react/jsx-uses-vars**: Prevents variables used in JSX to be incorrectly marked as unused.
*   **react/jsx-wrap-multilines**: Enforces consistent wrapping of multiline JSX.
*   **react/no-danger-with-children**: Prevents children from being passed to components using `dangerouslySetInnerHTML`.
*   **react/no-deprecated**: Prevents usage of deprecated methods.
*   **react/no-direct-mutation-state**: Prevents direct mutation of `this.state`.
*   **react/no-unused-prop-types**: Prevents definitions of unused prop types.
*   **react/prop-types**: Enforces prop types declarations for components.
*   **react/react-in-jsx-scope**: Prevents missing `React` when using JSX.
*   **react/require-render-return**: Enforces a `return` statement in `render` methods.
*   **react/self-closing-comp**: Prevents extra closing tags for components without children.
*   **react/void-dom-elements-no-children**: Prevents void DOM elements from receiving children.
*   **react-hooks/rules-of-hooks**: Enforces Rules of Hooks.
*   **react-hooks/exhaustive-deps**: Verifies the list of dependencies for Hooks like `useEffect` and `useCallback`.
*   **jsx-a11y/accessible-emoji**: Enforces that emojis are accessible.
*   **jsx-a11y/alt-text**: Enforces that all elements that require alternative text have it.
*   **jsx-a11y/anchor-has-content**: Enforces that anchors have content.
*   **jsx-a11y/anchor-is-valid**: Enforces that anchors are valid.
*   **jsx-a11y/aria-activedescendant-has-tabindex**: Enforces that `aria-activedescendant` is used with a `tabindex`.
*   **jsx-a11y/aria-props**: Enforces that ARIA props are valid.
*   **jsx-a11y/aria-proptypes**: Enforces that ARIA prop values are valid.
*   **jsx-a11y/aria-role**: Enforces that elements with ARIA roles must use a valid role.
*   **jsx-a11y/aria-unsupported-elements**: Enforces that ARIA attributes are not used on unsupported elements.
*   **jsx-a11y/heading-has-content**: Enforces that headings have content.
*   **jsx-a11y/html-has-lang**: Enforces that `<html>` elements have a `lang` prop.
*   **jsx-a11y/iframe-has-title**: Enforces that `<iframe>` elements have a title.
*   **jsx-a11y/img-redundant-alt**: Enforces that `<img>` alt text does not contain redundant words like "image" or "picture".
*   **jsx-a11y/no-access-key**: Enforces that `accessKey` props are not used.
*   **jsx-a11y/no-distracting-elements**: Enforces that distracting elements are not used.
*   **jsx-a11y/no-redundant-roles**: Enforces that redundant ARIA roles are not used.
*   **jsx-a11y/role-has-required-aria-props**: Enforces that elements with ARIA roles have all required attributes for that role.
*   **jsx-a11y/role-supports-aria-props**: Enforces that elements with explicit or implicit roles defined contain only `aria-*` properties supported by that `role`.
*   **jsx-a11y/scope**: Enforces that `scope` prop is only used on `<th>` elements.
